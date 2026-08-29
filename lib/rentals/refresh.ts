import { RENTAL_ADAPTERS } from "./adapters";
import { isRentModel, rentModelBySlug } from "./models";
import {
  readRentalHistory,
  readRentalMeta,
  todayISO,
  writeOffers,
  writeRentalHistory,
  writeRentalMeta,
} from "../store";
import type { OfferBook, RentalOffer } from "./types";

/**
 * One rental sweep.
 *
 * Structurally different from the retail sweep, and cheaper: retail asks each
 * source once per part, while every rental feed publishes its entire catalog
 * in one call. So a sweep is a handful of requests, and the work is in
 * normalizing and filtering what comes back.
 *
 * The day's record per (model, provider) is the lowest *per-GPU* hourly rate,
 * accumulated across sweeps the same way retail lows are — so `lo` is the true
 * low for the day, not merely the most recent observation.
 */

const KEPT_OFFERS = 8;

/**
 * A rate this far under the model's median across providers is not a bargain,
 * it's a mistake — a fractional-GPU slice, a preemptible meter that slipped
 * the filter, or a GPU-count mapping that's wrong. Only applied once enough
 * providers quote the model for a median to mean anything.
 */
const OUTLIER_FLOOR = 0.25;
const OUTLIER_MIN_SAMPLE = 4;

/**
 * Is this a real, comparable rate for this model?
 *
 * The rate band does the heavy lifting: it catches unit errors (cents read as
 * dollars), fractional-GPU slices sold as whole cards, and GPU-count mistakes,
 * all of which show up as a per-GPU rate that is orders of magnitude off.
 */
function usable(offer: RentalOffer): boolean {
  const model = rentModelBySlug(offer.modelSlug);
  if (!model) return false;
  if (!Number.isFinite(offer.perGpuHour) || offer.perGpuHour <= 0) return false;
  if (!Number.isFinite(offer.nodeHour) || offer.nodeHour <= 0) return false;
  if (!Number.isInteger(offer.gpuCount) || offer.gpuCount < 1) return false;
  return offer.perGpuHour >= model.rateMin && offer.perGpuHour <= model.rateMax;
}

/**
 * The rate to record for a provider today, guarding against one bogus offer
 * dragging the series down. Expects `sorted` ascending by per-GPU rate, and
 * `reference` to be every provider's cheapest rate for the model.
 */
function pickLow(sorted: RentalOffer[], reference: number[]): RentalOffer | null {
  if (sorted.length === 0) return null;
  if (reference.length < OUTLIER_MIN_SAMPLE) return sorted[0];
  const median = [...reference].sort((a, b) => a - b)[
    Math.floor(reference.length / 2)
  ];
  const floor = median * OUTLIER_FLOOR;
  return sorted.find((o) => o.perGpuHour >= floor) ?? sorted[0];
}

export interface RentalRefreshResult {
  at: string;
  /** (model, provider) pairs that produced a rate. */
  rates: number;
  /** Distinct providers that quoted at least one model. */
  providers: number;
  errors: Record<string, string>;
}

let inFlight: Promise<RentalRefreshResult> | null = null;

export function refreshRentals(): Promise<RentalRefreshResult> {
  inFlight ??= doRefresh().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

export const isRefreshingRentals = (): boolean => inFlight !== null;

/** Rental rates move faster than retail, but the feeds are cheap — 10 min. */
const SWEEP_INTERVAL_MS = Math.max(
  60_000,
  Number(process.env.RENTAL_SWEEP_INTERVAL_MS) || 10 * 60_000
);

/** Fire-and-forget freshness guard, mirroring the retail side. */
export function ensureRentalsFresh(): void {
  if (inFlight) return;
  let last: number | null = null;
  try {
    const { lastRefresh } = readRentalMeta();
    last = lastRefresh ? Date.parse(lastRefresh) : null;
  } catch {
    last = null;
  }
  if (last !== null && Date.now() - last < SWEEP_INTERVAL_MS) return;
  refreshRentals().catch(() => {
    // per-adapter errors are already recorded in rentals-meta.json
  });
}

async function doRefresh(): Promise<RentalRefreshResult> {
  const history = readRentalHistory();
  const day = todayISO();
  const at = new Date().toISOString();
  const errors: Record<string, string> = {};

  // Every adapter publishes its whole catalog, so they run fully in parallel.
  const harvested = await Promise.all(
    RENTAL_ADAPTERS.map(async (adapter) => {
      try {
        return (await adapter.fetchOffers()).filter(usable);
      } catch (e) {
        errors[adapter.id] = e instanceof Error ? e.message : String(e);
        return [] as RentalOffer[];
      }
    })
  );

  // model → provider → that provider's offers, cheapest per-GPU first.
  const byModel = new Map<string, Map<string, RentalOffer[]>>();
  for (const offer of harvested.flat()) {
    if (!isRentModel(offer.modelSlug)) continue;
    const providers = byModel.get(offer.modelSlug) ?? new Map();
    byModel.set(offer.modelSlug, providers);
    const list = providers.get(offer.providerId) ?? [];
    list.push(offer);
    providers.set(offer.providerId, list);
  }

  const book: OfferBook = {};
  const providersSeen = new Set<string>();
  let rates = 0;

  for (const [modelSlug, providers] of byModel) {
    for (const list of providers.values()) {
      list.sort((a, b) => a.perGpuHour - b.perGpuHour);
    }
    // Each provider's own cheapest rate is the sample the outlier guard uses,
    // so one host listing forty machines can't skew the market median.
    const reference = [...providers.values()].map((l) => l[0].perGpuHour);

    for (const [providerId, list] of providers) {
      const low = pickLow(list, reference);
      if (!low) continue;

      const days = ((history[modelSlug] ??= {})[providerId] ??= {});
      const prev = days[day];
      days[day] = prev
        ? {
            lo: Math.min(prev.lo, low.perGpuHour),
            hi: Math.max(prev.hi, low.perGpuHour),
            n: prev.n + 1,
            at,
          }
        : { lo: low.perGpuHour, hi: low.perGpuHour, n: 1, at };

      // The book leads with the offer the recorded rate came from.
      (book[modelSlug] ??= {})[providerId] = [
        low,
        ...list.filter((o) => o !== low),
      ].slice(0, KEPT_OFFERS);

      providersSeen.add(providerId);
      rates++;
    }
  }

  writeRentalHistory(history);
  writeOffers(book);
  writeRentalMeta({ lastRefresh: at, errors });

  return { at, rates, providers: providersSeen.size, errors };
}
