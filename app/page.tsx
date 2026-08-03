import Link from "next/link";
import Delta from "@/components/Delta";
import LiveStatus from "@/components/LiveStatus";
import MarketBoard, { type BoardRow } from "@/components/MarketBoard";
import { usd } from "@/lib/format";
import { getAllQuotes } from "@/lib/quotes";
import { readHistory, readMeta } from "@/lib/store";
import { sourceById, SOURCES } from "@/lib/sources";

export const dynamic = "force-dynamic";

export default function Dashboard() {
  const all = getAllQuotes();
  const meta = readMeta();
  const history = readHistory();

  const snapshotCount = Object.values(history).reduce(
    (n, bySource) =>
      n + Object.values(bySource).reduce((m, days) => m + Object.keys(days).length, 0),
    0
  );
  const liveSourceCount = SOURCES.filter((s) => s.mode !== "link").length;
  const hasData = all.some(({ quote }) => quote.best !== null);

  const movers = all
    .filter(({ quote }) => quote.delta24h !== null && quote.best !== null)
    .sort((a, b) => a.quote.delta24h! - b.quote.delta24h!)
    .slice(0, 4);

  const rows: BoardRow[] = all.map(({ gpu, quote }) => ({
    slug: gpu.slug,
    ticker: gpu.ticker,
    name: gpu.name,
    category: gpu.category,
    vram: gpu.vram,
    best: quote.best,
    bestSourceName: quote.bestSourceId ? sourceById(quote.bestSourceId).name : null,
    delta24h: quote.delta24h,
    delta7d: quote.delta7d,
    spark: quote.spark,
    liveSources: quote.series.length,
  }));

  return (
    <div className="pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            The GPU board<span className="text-acc">.</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-ink2">
            Live street prices for gaming and AI silicon, aggregated across
            retailers, resellers and the used market.
          </p>
        </div>
        <LiveStatus lastRefresh={meta.lastRefresh} />
      </div>

      <div className="mt-8 grid grid-cols-2 gap-px border border-edge bg-edge sm:grid-cols-4">
        {[
          { label: "parts tracked", value: String(all.length) },
          { label: "live sources", value: String(liveSourceCount) },
          { label: "snapshots recorded", value: String(snapshotCount) },
          {
            label: "priced today",
            value: String(all.filter(({ quote }) => quote.best !== null).length),
          },
        ].map((t) => (
          <div key={t.label} className="bg-panel px-4 py-3">
            <p className="font-mono text-2xl text-ink tabular-nums">{t.value}</p>
            <p className="mt-1 font-mono text-[11px] tracking-wider text-mute uppercase">
              {t.label}
            </p>
          </div>
        ))}
      </div>

      {!hasData && (
        <div className="mt-8 border border-edge2 bg-panel px-5 py-4">
          <p className="text-sm text-ink">
            Warming up — the first price sweep is running now. Fresh prices
            appear here automatically in under a minute.
          </p>
        </div>
      )}

      {movers.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-mono text-xs tracking-widest text-mute uppercase">
            Movers — 24h best price
          </h2>
          <div className="grid gap-px border border-edge bg-edge sm:grid-cols-2 lg:grid-cols-4">
            {movers.map(({ gpu, quote }) => (
              <Link
                key={gpu.slug}
                href={`/gpu/${gpu.slug}`}
                className="group bg-panel px-4 py-4 transition-colors hover:bg-panel2"
              >
                <p className="font-mono text-xs text-acc">{gpu.ticker}</p>
                <p className="mt-1 truncate text-sm text-ink group-hover:text-ink">
                  {gpu.name}
                </p>
                <p className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono text-lg text-ink tabular-nums">
                    {usd(quote.best!)}
                  </span>
                  <Delta value={quote.delta24h} />
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="mb-3 font-mono text-xs tracking-widest text-mute uppercase">
          All tracked GPUs
        </h2>
        <MarketBoard rows={rows} />
      </section>
    </div>
  );
}
