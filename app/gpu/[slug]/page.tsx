import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Delta from "@/components/Delta";
import LiveStatus from "@/components/LiveStatus";
import PriceChart, { type ChartSeries } from "@/components/PriceChart";
import { usd } from "@/lib/format";
import { CATEGORY_LABEL, gpuBySlug } from "@/lib/gpus";
import { buildQuote } from "@/lib/quotes";
import { sourceById } from "@/lib/sources";
import { readListings, readMeta } from "@/lib/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const gpu = gpuBySlug((await params).slug);
  return { title: gpu ? `${gpu.ticker} — VRAMWATCH` : "VRAMWATCH" };
}

export default async function GpuPage({ params }: Props) {
  const { slug } = await params;
  const gpu = gpuBySlug(slug);
  if (!gpu) notFound();

  const quote = buildQuote(gpu);
  const book = readListings()[gpu.slug] ?? {};
  const meta = readMeta();

  const series: ChartSeries[] = quote.series.map((s) => {
    const src = sourceById(s.sourceId);
    return { id: s.sourceId, name: src.name, color: src.color, points: s.points };
  });

  const specs = [
    ["VRAM", gpu.vram],
    ["Architecture", gpu.arch],
    ["Vendor", gpu.vendor],
    ["MSRP", gpu.msrp !== null ? usd(gpu.msrp) : "negotiated"],
  ] as const;

  return (
    <div className="pt-8">
      <nav className="font-mono text-xs text-mute">
        <Link href="/" className="hover:text-acc">
          board
        </Link>{" "}
        / {gpu.ticker}
      </nav>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">{gpu.name}</h1>
            <span className="border border-edge2 px-2 py-0.5 font-mono text-[11px] tracking-wider text-ink2 uppercase">
              {CATEGORY_LABEL[gpu.category]}
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-ink2">{gpu.blurb}</p>
        </div>
        <LiveStatus lastRefresh={meta.lastRefresh} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-px border border-edge bg-edge sm:grid-cols-4">
        {specs.map(([k, v]) => (
          <div key={k} className="bg-panel px-4 py-3">
            <p className="font-mono text-[11px] tracking-wider text-mute uppercase">{k}</p>
            <p className="mt-1 text-sm text-ink">{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-end gap-x-10 gap-y-4">
        <div>
          <p className="font-mono text-[11px] tracking-wider text-mute uppercase">
            best price
          </p>
          {quote.best !== null ? (
            <p className="mt-1 flex items-baseline gap-3">
              <span className="font-mono text-4xl text-ink tabular-nums">
                {usd(quote.best)}
              </span>
              {quote.bestSourceId && (
                <span className="font-mono text-xs text-ink2">
                  at {sourceById(quote.bestSourceId).name}
                </span>
              )}
            </p>
          ) : (
            <p className="mt-1 font-mono text-2xl text-mute">no data yet</p>
          )}
        </div>
        {(
          [
            ["24h", quote.delta24h],
            ["7d", quote.delta7d],
            ["30d", quote.delta30d],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <p className="font-mono text-[11px] tracking-wider text-mute uppercase">
              {label}
            </p>
            <p className="mt-1 text-base">
              <Delta value={value} />
            </p>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <PriceChart series={series} msrp={gpu.msrp} />
        <p className="mt-2 font-mono text-[11px] text-mute">
          Daily lows per source — hover the chart for detail.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 font-mono text-xs tracking-widest text-mute uppercase">
          Where to buy
        </h2>
        <div className="grid gap-px border border-edge bg-edge md:grid-cols-2">
          {gpu.sources.map((sourceId) => {
            const src = sourceById(sourceId);
            const listings = book[sourceId] ?? [];
            const cheapest = listings[0];
            return (
              <div key={sourceId} className="flex flex-col bg-panel px-5 py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="flex items-center gap-2 text-sm text-ink">
                    <span
                      aria-hidden
                      className="inline-block h-2 w-2"
                      style={{ background: src.color }}
                    />
                    {src.name}
                  </p>
                  <p className="font-mono text-[11px] text-mute">
                    {src.mode === "link" ? "link only" : src.kind}
                  </p>
                </div>

                {cheapest ? (
                  <>
                    <p className="mt-3 font-mono text-2xl text-ink tabular-nums">
                      {usd(cheapest.price)}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-ink2" title={cheapest.title}>
                      {cheapest.title}
                    </p>
                    {listings.length > 1 && (
                      <ul className="mt-3 space-y-1 border-t border-edge pt-2">
                        {listings.slice(1, 4).map((l) => (
                          <li key={l.url} className="flex items-baseline gap-2">
                            <a
                              href={l.url}
                              target="_blank"
                              rel="noopener noreferrer nofollow"
                              className="line-clamp-1 flex-1 text-xs text-ink2 hover:text-acc"
                            >
                              {l.title}
                            </a>
                            <span className="font-mono text-xs text-ink tabular-nums">
                              {usd(l.price)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <p className="mt-3 text-xs text-mute">
                    {src.mode === "scrape"
                      ? "No matching listings right now."
                      : sourceId === "ebay"
                        ? "Browse the used market on eBay."
                        : `Check the current price directly at ${src.name}.`}
                  </p>
                )}

                <div className="mt-auto pt-4">
                  <a
                    href={cheapest ? cheapest.url : src.searchUrl(gpu.query)}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-block border border-edge2 px-3 py-1.5 font-mono text-xs text-ink transition-colors hover:border-acc hover:text-acc"
                  >
                    {cheapest ? `Buy at ${src.name} ↗` : `Search ${src.name} ↗`}
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
