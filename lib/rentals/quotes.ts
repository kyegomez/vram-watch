import { RENT_MODELS, rentModelBySlug } from "./models";
import { readOffers, readRentalHistory } from "../store";
import type { PricePoint } from "../types";
import type { ProviderRate, RentalOffer, RentalQuote, RentModel } from "./types";

/** Build display quotes for the rental market from accumulated real sweeps. */

/** Cheapest rate seen on each day, across every provider. */
function bestPerDay(rates: ProviderRate[]): PricePoint[] {
  const byDay = new Map<string, number>();
  for (const r of rates) {
    for (const p of r.points) {
      const prev = byDay.get(p.date);
      if (prev === undefined || p.price < prev) byDay.set(p.date, p.price);
    }
  }
  return [...byDay.entries()]
    .map(([date, price]) => ({ date, price }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Change vs. the closest snapshot at least `days` old (null if none). */
function deltaOver(best: PricePoint[], days: number): number | null {
  if (best.length < 2) return null;
  const last = best[best.length - 1];
  const cutoff = new Date(`${last.date}T00:00:00Z`).getTime() - days * 86400_000;
  const base = [...best]
    .reverse()
    .find((p) => new Date(`${p.date}T00:00:00Z`).getTime() <= cutoff);
  if (!base || base.price === 0) return null;
  return (last.price - base.price) / base.price;
}

/**
 * Can this offer actually be rented right now? `undefined` means the provider
 * doesn't publish availability (AWS and Azure don't), and absent a statement
 * we take the list price at its word.
 */
const bookable = (o: RentalOffer): boolean => o.available !== false;

/**
 * The cheapest node that gets you a real multi-GPU box. Cluster shoppers are
 * buying an interconnect as much as the GPUs, so an 8-way node is the unit —
 * falling back to the largest node on offer when nobody lists eight, and
 * preferring capacity you can book over a cheaper box that is sold out.
 */
function bestCluster(offers: RentalOffer[]): RentalOffer | null {
  const pick = (pool: RentalOffer[]): RentalOffer | null =>
    pool.length === 0
      ? null
      : pool.reduce((a, b) => (b.perGpuHour < a.perGpuHour ? b : a));

  const multi = offers.filter((o) => o.gpuCount >= 8);
  const pool = multi.length > 0 ? multi : offers.filter((o) => o.gpuCount > 1);
  return pick(pool.filter(bookable)) ?? pick(pool);
}

export function buildRentalQuote(model: RentModel): RentalQuote {
  const history = readRentalHistory()[model.slug] ?? {};
  const book = readOffers()[model.slug] ?? {};

  const rates: ProviderRate[] = Object.entries(book)
    .map(([providerId, offers]) => {
      const days = history[providerId] ?? {};
      const points = Object.entries(days)
        .map(([date, stat]) => ({ date, price: stat.lo }))
        .sort((a, b) => (a.date < b.date ? -1 : 1));
      const sorted = [...offers].sort((a, b) => a.perGpuHour - b.perGpuHour);
      // Quote the cheapest shape this provider can actually give you; fall
      // back to its cheapest overall only when it has no capacity at all.
      const open = sorted.find(bookable) ?? null;
      const quoted = open ?? sorted[0];
      return {
        providerId,
        perGpuHour: quoted.perGpuHour,
        bookable: open ? open.perGpuHour : null,
        offer: quoted,
        offers: sorted,
        points,
      };
    })
    .filter((r) => r.offers.length > 0)
    .sort((a, b) => a.perGpuHour - b.perGpuHour);

  // History can hold providers that aren't quoting today; they still chart.
  for (const [providerId, days] of Object.entries(history)) {
    if (rates.some((r) => r.providerId === providerId)) continue;
    const points = Object.entries(days)
      .map(([date, stat]) => ({ date, price: stat.lo }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    if (points.length === 0) continue;
    rates.push({
      providerId,
      perGpuHour: points[points.length - 1].price,
      bookable: null,
      offer: {
        providerId,
        modelSlug: model.slug,
        gpuCount: 1,
        nodeHour: points[points.length - 1].price,
        perGpuHour: points[points.length - 1].price,
        instance: "—",
        available: false,
      },
      offers: [],
      points,
    });
  }

  // History-only providers were appended after the sort, so restore rate order
  // — the chart colors series by rank, and the provider list reads cheapest
  // first. Providers with no capacity sort on the rate they'd charge if they had it.
  rates.sort((a, b) => a.perGpuHour - b.perGpuHour);

  const live = rates.filter((r) => r.offers.length > 0);
  const spark = bestPerDay(rates);
  const allOffers = live.flatMap((r) => r.offers);

  // The headline is what you can book. An offer nobody has capacity for is a
  // real market rate worth charting, but it is not a price you can pay today.
  const open = live.filter((r) => r.bookable !== null);
  const headline = open.length > 0 ? open[0] : (live[0] ?? null);

  const best = headline ? (headline.bookable ?? headline.perGpuHour) : null;
  const spreadHigh =
    live.length > 0 ? Math.max(...live.map((r) => r.perGpuHour)) : null;

  return {
    slug: model.slug,
    best,
    bestProviderId: headline ? headline.providerId : null,
    bestAvailable: open.length > 0,
    spreadHigh,
    bestCluster: bestCluster(allOffers),
    providerCount: live.length,
    availableCount: allOffers.filter((o) => o.available !== false).length,
    delta24h: deltaOver(spark, 1),
    delta7d: deltaOver(spark, 7),
    delta30d: deltaOver(spark, 30),
    spark: spark.slice(-30),
    rates,
  };
}

export function getAllRentalQuotes(): {
  model: RentModel;
  quote: RentalQuote;
}[] {
  return RENT_MODELS.map((model) => ({
    model,
    quote: buildRentalQuote(model),
  }));
}

export const rentalQuoteFor = (slug: string): RentalQuote | null => {
  const model = rentModelBySlug(slug);
  return model ? buildRentalQuote(model) : null;
};
