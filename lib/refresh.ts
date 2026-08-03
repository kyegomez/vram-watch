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

/** Retail series track new-condition prices; the used market belongs to used-by-nature sources. */
const USED = /\bused\b|refurb|open box|renewed|pre-owned/i;

function matches(gpu: Gpu, listing: Listing, source: Source): boolean {
  const title = listing.title.toLowerCase();
  if (!new RegExp(gpu.match, "i").test(title)) return false;
  if (new RegExp(gpu.exclude, "i").test(title)) return false;
  const usedAllowed =
    gpu.usedOk || source.usedSource || source.kind === "marketplace";
  if (!usedAllowed && USED.test(title)) return false;
  return listing.price >= gpu.priceMin && listing.price <= gpu.priceMax;
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
  const errors: Record<string, string> = {};
  let prices = 0;

  await Promise.all(
    activeAdapters().map(async (adapter) => {
      const source = sourceById(adapter.id);
      const carried = GPUS.filter((g) => g.sources.includes(adapter.id));
      for (const gpu of carried) {
        try {
          const all = await adapter.fetchListings(gpu.query);
          const good = all
            .filter((l) => matches(gpu, l, source))
            .sort((a, b) => a.price - b.price);

          if (good.length > 0) {
            (history[gpu.slug] ??= {})[adapter.id] ??= {};
            history[gpu.slug][adapter.id][day] = good[0].price;
            (book[gpu.slug] ??= {})[adapter.id] = good.slice(0, KEPT_LISTINGS);
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

  const at = new Date().toISOString();
  writeHistory(history);
  writeListings(book);
  writeMeta({ lastRefresh: at, errors });

  return { at, prices, errors };
}
