import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Delta from "@/components/Delta";
import JsonLd from "@/components/JsonLd";
import LiveStatus from "@/components/LiveStatus";
import PriceChart, { type ChartSeries } from "@/components/PriceChart";
import { pct, usd } from "@/lib/format";
import { CATEGORY_LABEL, GPUS, gpuBySlug } from "@/lib/gpus";
import { buildQuote } from "@/lib/quotes";
import { breadcrumbSchema, gpuProductSchema, jsonLdGraph } from "@/lib/seo";
import { SITE_NAME } from "@/lib/site";
import { sourceById } from "@/lib/sources";
import { readListings, readMeta } from "@/lib/store";
import type { Gpu, GpuQuote } from "@/lib/types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

/** Title and description both lead with the live price — that's the snippet. */
function seoCopy(gpu: Gpu, quote: GpuQuote) {
  const sourceCount = gpu.sources.length;
  const priced = quote.best !== null;
  const bestSource = quote.bestSourceId
    ? sourceById(quote.bestSourceId).name
    : null;

  const title = priced
    ? `${gpu.name} Price — ${usd(quote.best!)} (Live${bestSource ? `, ${bestSource}` : ""})`
    : `${gpu.name} Price — Live Tracker & Price History`;

  const move =
    quote.delta24h !== null
      ? ` ${pct(quote.delta24h)} in 24h.`
      : "";

  const description = priced
    ? `${gpu.name} street price today: ${usd(quote.best!)}${
        bestSource ? ` at ${bestSource}` : ""
      }.${move} Compare live prices across ${sourceCount} retailers, resellers and the used market, with ${gpu.vram} specs, full price history and direct buy links.`
    : `Track the ${gpu.name} (${gpu.vram}, ${gpu.arch}) street price across ${sourceCount} retailers, resellers and the used market. Live price comparison, price history charts and direct buy links.`;

  return { title, description };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const gpu = gpuBySlug(slug);

  if (!gpu) {
    return {
      title: "GPU not found",
      robots: { index: false, follow: true },
    };
  }

  const quote = buildQuote(gpu);
  const { title, description } = seoCopy(gpu, quote);
  const path = `/gpu/${gpu.slug}`;

  return {
    title,
    description,
    keywords: [
      `${gpu.name} price`,
      `${gpu.ticker} price`,
      `${gpu.name} price history`,
      `${gpu.name} deal`,
      `buy ${gpu.name}`,
      `cheapest ${gpu.name}`,
      `${gpu.vendor} ${CATEGORY_LABEL[gpu.category]} GPU price`,
      `${gpu.arch} GPU price`,
    ],
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_US",
      url: path,
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [
        {
          url: `${path}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `${gpu.name} price card — live street price and 24h move`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE_NAME}`,
      description,
    },
    other: {
      // Non-standard but widely consumed by shopping/aggregation crawlers.
      ...(quote.best !== null
        ? {
            "product:price:amount": String(quote.best),
            "product:price:currency": "USD",
          }
        : {}),
    },
  };
}

export default async function GpuPage({ params }: Props) {
  const { slug } = await params;
  const gpu = gpuBySlug(slug);
  if (!gpu) notFound();

  const quote = buildQuote(gpu);
  const book = readListings()[gpu.slug] ?? {};
  const meta = readMeta();
  const { description } = seoCopy(gpu, quote);

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

  const related = GPUS.filter(
    (g) => g.category === gpu.category && g.slug !== gpu.slug
  ).slice(0, 6);

  const vsMsrp =
    gpu.msrp !== null && quote.best !== null
      ? (quote.best - gpu.msrp) / gpu.msrp
      : null;

  return (
    <div className="pt-8">
      <JsonLd
        data={jsonLdGraph(
          gpuProductSchema(gpu, quote, book, description),
          breadcrumbSchema([
            { name: "GPU board", path: "/" },
            { name: gpu.name, path: `/gpu/${gpu.slug}` },
          ])
        )}
      />

      <nav aria-label="Breadcrumb" className="font-mono text-xs text-mute">
        <ol className="flex items-center gap-1">
          <li>
            <Link href="/" className="hover:text-acc">
              board
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page">{gpu.ticker}</li>
        </ol>
      </nav>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">
              {gpu.name} price
            </h1>
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

      {/* A one-line answer for the query that brought the visitor here. */}
      <p className="mt-6 max-w-3xl text-sm leading-relaxed text-ink2">
        {quote.best !== null ? (
          <>
            The cheapest {gpu.name} we can currently find is{" "}
            <strong className="text-ink">{usd(quote.best)}</strong>
            {quote.bestSourceId && <> at {sourceById(quote.bestSourceId).name}</>}
            {vsMsrp !== null && (
              <>
                {" "}
                — {vsMsrp > 0 ? "about " : "roughly "}
                <strong className="text-ink">
                  {pct(Math.abs(vsMsrp))} {vsMsrp > 0 ? "above" : "below"}
                </strong>{" "}
                its {usd(gpu.msrp!)} MSRP
              </>
            )}
            . Prices below are the lowest matching listing at each of{" "}
            {gpu.sources.length} tracked sources and refresh automatically.
          </>
        ) : (
          <>
            No matching {gpu.name} listing has been quoted yet. The tracker
            sweeps {gpu.sources.length} sources continuously — prices and
            history appear here as soon as one lands.
          </>
        )}
      </p>

      <section className="mt-8" aria-labelledby="history-heading">
        <h2
          id="history-heading"
          className="mb-3 font-mono text-xs tracking-widest text-mute uppercase"
        >
          {gpu.ticker} price history
        </h2>
        <PriceChart series={series} msrp={gpu.msrp} />
        <p className="mt-2 font-mono text-[11px] text-mute">
          Daily lows per source — hover the chart for detail.
        </p>
      </section>

      <section className="mt-10" aria-labelledby="buy-heading">
        <h2
          id="buy-heading"
          className="mb-3 font-mono text-xs tracking-widest text-mute uppercase"
        >
          Where to buy the {gpu.name}
        </h2>
        <div className="grid gap-px border border-edge bg-edge md:grid-cols-2">
          {gpu.sources.map((sourceId) => {
            const src = sourceById(sourceId);
            const listings = book[sourceId] ?? [];
            const cheapest = listings[0];
            return (
              <div key={sourceId} className="flex flex-col bg-panel px-5 py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-sm text-ink">
                    <span
                      aria-hidden
                      className="inline-block h-2 w-2"
                      style={{ background: src.color }}
                    />
                    {src.name}
                  </h3>
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
                              rel="noopener noreferrer nofollow sponsored"
                              title={l.title}
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
                    rel="noopener noreferrer nofollow sponsored"
                    aria-label={
                      cheapest
                        ? `Buy the ${gpu.name} at ${src.name} for ${usd(cheapest.price)}`
                        : `Search for the ${gpu.name} at ${src.name}`
                    }
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

      {related.length > 0 && (
        <section className="mt-12" aria-labelledby="related-heading">
          <h2
            id="related-heading"
            className="mb-3 font-mono text-xs tracking-widest text-mute uppercase"
          >
            Compare with other {CATEGORY_LABEL[gpu.category].toLowerCase()} GPUs
          </h2>
          <ul className="flex flex-wrap gap-px border border-edge bg-edge">
            {related.map((g) => (
              <li key={g.slug} className="flex-1 bg-panel">
                <Link
                  href={`/gpu/${g.slug}`}
                  title={`${g.name} price and price history`}
                  className="block px-4 py-3 whitespace-nowrap transition-colors hover:bg-panel2"
                >
                  <span className="font-mono text-xs text-acc">{g.ticker}</span>
                  <span className="mt-1 block text-xs text-ink2">
                    {g.name} price
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
