import { GPUS } from "./gpus";
import { readHistory } from "./store";
import type { Gpu, GpuQuote, PricePoint, SourceSeries } from "./types";

/** Build display quotes from accumulated real snapshots. */

function bestPerDay(series: SourceSeries[]): PricePoint[] {
  const byDay = new Map<string, number>();
  for (const s of series) {
    for (const p of s.points) {
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

export function buildQuote(gpu: Gpu): GpuQuote {
  const history = readHistory()[gpu.slug] ?? {};

  const series: SourceSeries[] = gpu.sources
    .map((sourceId) => {
      const days = history[sourceId] ?? {};
      const points = Object.entries(days)
        .map(([date, price]) => ({ date, price }))
        .sort((a, b) => (a.date < b.date ? -1 : 1));
      return {
        sourceId,
        points,
        current: points.length > 0 ? points[points.length - 1].price : null,
      };
    })
    .filter((s) => s.points.length > 0);

  const best = bestPerDay(series);
  const today = best.length > 0 ? best[best.length - 1] : null;

  let bestSourceId: string | null = null;
  let bestPrice: number | null = null;
  for (const s of series) {
    const latest = s.points[s.points.length - 1];
    if (latest.date !== today?.date) continue; // stale source, don't quote it
    if (bestPrice === null || latest.price < bestPrice) {
      bestPrice = latest.price;
      bestSourceId = s.sourceId;
    }
  }

  return {
    slug: gpu.slug,
    best: bestPrice,
    bestSourceId,
    delta24h: deltaOver(best, 1),
    delta7d: deltaOver(best, 7),
    delta30d: deltaOver(best, 30),
    spark: best.slice(-30),
    series,
  };
}

export function getAllQuotes(): { gpu: Gpu; quote: GpuQuote }[] {
  return GPUS.map((gpu) => ({ gpu, quote: buildQuote(gpu) }));
}
