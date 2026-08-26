import { activeAdapters } from "./adapters";
import { sleep } from "./adapters/http";
import { GPUS } from "./gpus";
import {
  readHistory,
  readListings,
  readMeta,
  todayISO,
  writeHistory,
  writeListings,
  writeMeta,
} from "./store";
import { sourceById } from "./sources";
import type { Gpu, Listing, Source } from "./types";

/**
 * One refresh pass: for every (source, gpu) pair, pull live listings, keep the
 * ones that actually are that GPU (title match + price sanity band), and
 * record the day's best price. Sources run in parallel; queries within a
 * source run sequentially with a polite delay.
 */

const PER_QUERY_DELAY_MS = 600;
const KEPT_LISTINGS = 6;

/**
 * A listing priced below this fraction of the matched set's median is treated
 * as noise — a bait listing, a mispriced SKU, or an accessory that slipped the
 * regex — rather than the day's low. Only applied once there are enough
 * listings for a median to mean anything.
 */
const OUTLIER_FLOOR = 0.4;
const OUTLIER_MIN_SAMPLE = 4;

/** Retail series track new-condition prices; the used market belongs to used-by-nature sources. */
const USED = /\bused\b|refurb|open box|renewed|pre-owned/i;

/**
 * The query to send this source for this part. Search engines disagree wildly:
 * Newegg and Magento want the full product name, while Odoo narrows to nothing
 * on a long string and BigCommerce/Shopify OR the terms into noise. Parts that
 * need a different phrasing declare it in `queries`.
 */
export function queryFor(gpu: Gpu, source: Source): string {
  const explicit = gpu.queries?.[source.id];
  if (explicit) return explicit;

  const model = gpu.modelQuery ?? gpu.query;
  switch (source.searchStyle) {
    case "model":
      return model;
    case "vendorModel":
      return `${gpu.vendor} ${model}`;
    default:
      return gpu.query;
  }
}

function matches(gpu: Gpu, listing: Listing, source: Source): boolean {
  if (listing.inStock === false) return false; // priced but not buyable
  const title = listing.title.toLowerCase();
  if (!new RegExp(gpu.match, "i").test(title)) return false;
  if (new RegExp(gpu.exclude, "i").test(title)) return false;
  const usedAllowed =
    gpu.usedOk || source.usedSource || source.kind === "marketplace";
  if (!usedAllowed && USED.test(title)) return false;
  return listing.price >= gpu.priceMin && listing.price <= gpu.priceMax;
}

/**
 * The day's low for a source, guarding against a single bogus listing
 * dragging the whole series down. Expects `sorted` ascending by price.
 */
function pickLow(sorted: Listing[]): Listing | null {
  if (sorted.length === 0) return null;
  if (sorted.length < OUTLIER_MIN_SAMPLE) return sorted[0];
  const median = sorted[Math.floor(sorted.length / 2)].price;
  const floor = median * OUTLIER_FLOOR;
  return sorted.find((l) => l.price >= floor) ?? sorted[0];
}

export interface RefreshResult {
  at: string;
  prices: number; // (gpu, source) pairs that produced a price
  errors: Record<string, string>;
}

let inFlight: Promise<RefreshResult> | null = null;

export function refreshAll(): Promise<RefreshResult> {
  // collapse concurrent triggers into one pass
  inFlight ??= doRefresh().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** How stale the store may get before a sweep re-runs (min 60s to stay polite). */
const SWEEP_INTERVAL_MS = Math.max(
  60_000,
  Number(process.env.SWEEP_INTERVAL_MS) || 10 * 60_000
);

export const isRefreshing = (): boolean => inFlight !== null;

/**
 * Fire-and-forget freshness guard: kicks off a background sweep when the
 * store is stale. Called from the tick endpoint the UI polls, so a deployed
 * instance keeps itself current without any cron.
 */
export function ensureFresh(): void {
  if (inFlight) return;
  const last = readMetaSafe();
  if (last !== null && Date.now() - last < SWEEP_INTERVAL_MS) return;
  refreshAll().catch(() => {
    // errors are already recorded per-source in meta.json
  });
}

function readMetaSafe(): number | null {
  try {
    const { lastRefresh } = readMeta();
    return lastRefresh ? Date.parse(lastRefresh) : null;
  } catch {
    return null;
  }
}

async function doRefresh(): Promise<RefreshResult> {
  const history = readHistory();
  const book = readListings();
  const day = todayISO();
  const at = new Date().toISOString();
  const errors: Record<string, string> = {};
  let prices = 0;

  await Promise.all(
    activeAdapters().map(async (adapter) => {
      const source = sourceById(adapter.id);
      const carried = GPUS.filter((g) => g.sources.includes(adapter.id));
      for (const gpu of carried) {
        try {
          const all = await adapter.fetchListings(queryFor(gpu, source));
          const good = all
            .filter((l) => matches(gpu, l, source))
            .sort((a, b) => a.price - b.price);

          const low = pickLow(good);
          if (low !== null) {
            // Accumulate into the day rather than overwriting it, so `lo` is
            // the real low across every sweep and not just the latest one.
            const days = ((history[gpu.slug] ??= {})[adapter.id] ??= {});
            const prev = days[day];
            days[day] = prev
              ? {
                  lo: Math.min(prev.lo, low.price),
                  hi: Math.max(prev.hi, low.price),
                  n: prev.n + 1,
                  at,
                }
              : { lo: low.price, hi: low.price, n: 1, at };

            // The book leads with the listing the price actually came from.
            const kept = [low, ...good.filter((l) => l !== low)].slice(0, KEPT_LISTINGS);
            (book[gpu.slug] ??= {})[adapter.id] = kept;
            prices++;
          }
        } catch (e) {
          errors[`${adapter.id}:${gpu.slug}`] =
            e instanceof Error ? e.message : String(e);
        }
        await sleep(PER_QUERY_DELAY_MS);
      }
    })
  );

  writeHistory(history);
  writeListings(book);
  writeMeta({ lastRefresh: at, errors });

  return { at, prices, errors };
}
