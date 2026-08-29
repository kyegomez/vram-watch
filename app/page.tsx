import type { Metadata } from "next";
import Link from "next/link";
import Delta from "@/components/Delta";
import JsonLd from "@/components/JsonLd";
import LiveStatus from "@/components/LiveStatus";
import MarketBoard, { type BoardRow } from "@/components/MarketBoard";
import { perHour, usd } from "@/lib/format";
import { getAllQuotes } from "@/lib/quotes";
import { providerById } from "@/lib/rentals/providers";
import { getAllRentalQuotes } from "@/lib/rentals/quotes";
import {
  boardItemListSchema,
  faqSchema,
  jsonLdGraph,
} from "@/lib/seo";
import {
  SITE_DESCRIPTION,
  SITE_DESCRIPTION_SHORT,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_TITLE,
} from "@/lib/site";
import { readHistory, readMeta } from "@/lib/store";
import { sourceById, SOURCES } from "@/lib/sources";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    absolute: SITE_TITLE,
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    url: "/",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION_SHORT,
  },
};

/** Visible copy and FAQPage markup read from the same array — never drift. */
const FAQ = [
  {
    q: "How often do GPU prices update?",
    a: "The board re-sweeps every source in the background on a fixed interval (10 minutes by default) and the page polls for fresh data every 10 seconds, so the prices you see are the current lowest matching listings rather than a cached daily snapshot.",
  },
  {
    q: "Where do the prices come from?",
    a: "Newegg, Central Computer, Wiredzone, PC Server & Parts, TechMikeNY, Server Part Deals and the Supermicro store are fetched live server-side. eBay and Best Buy come through their official APIs. Micro Center, B&H Photo and Amazon refuse automated requests, so those get deep search links instead of a quoted price. The sources page lists every one of them and what it covers.",
  },
  {
    q: "Is the price history real?",
    a: "Yes. Every sweep records the day's lowest matching listing per GPU per source, so the charts are built from this tracker's own observations — not estimates or modeled prices. History deepens the longer the tracker runs.",
  },
  {
    q: "Do you track datacenter AI GPUs like the H100, H200 and B200?",
    a: "Yes. Alongside consumer cards like the RTX 5090 and RX 9070 XT, the board tracks workstation parts (RTX 6000 Ada, RTX PRO 6000, L40S) and datacenter accelerators including the A100, H100 PCIe/SXM/NVL, H200, B200, AMD MI300X/MI325X/MI355X and Huawei Ascend 910B.",
  },
  {
    q: "Are used and refurbished GPU prices included?",
    a: "The used market is tracked separately: eBay and PC Server & Parts carry used and refurbished inventory, while retailer series track new-condition pricing. End-of-life parts such as the RTX 4090 and V100 are allowed to quote used prices at retailers too, since that is how they actually trade.",
  },
  {
    q: "Can I compare GPU rental prices too?",
    a: "Yes — the rental board tracks what the same silicon costs by the hour across AWS, Azure, RunPod, Vast.ai, Lambda, Crusoe, Nebius, Voltage Park, Hyperstack and more, priced both per GPU-hour and per whole cluster node. Every GPU tracked on both sides also shows a rent-vs-buy breakeven: how many hours of renting cost the same as buying the card outright.",
  },
  {
    q: "Does clicking a buy link cost anything?",
    a: "No. Buy links go straight to the seller's own listing at the price shown. Availability and final checkout pricing are always set by the seller.",
  },
];

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

  // Headline figures for the rental board, so the buy side points at it with a
  // real number rather than a bare link.
  const rentals = getAllRentalQuotes();
  const rentPriced = rentals.filter(({ quote }) => quote.best !== null);
  const rentProviders = new Set(
    rentals.flatMap(({ quote }) =>
      quote.rates.filter((r) => r.offers.length > 0).map((r) => r.providerId)
    )
  );
  const headlineRental =
    rentPriced.find(({ model }) => model.slug === "h100-sxm") ?? rentPriced[0];

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
      <JsonLd
        data={jsonLdGraph(
          {
            "@type": "CollectionPage",
            name: SITE_TITLE,
            description: SITE_DESCRIPTION,
            url: "/",
          },
          boardItemListSchema(all),
          faqSchema(FAQ)
        )}
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            GPU Aggregator<span className="text-acc">.</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-ink2">
            Live street prices for gaming and AI silicon, aggregated across
            retailers, resellers and the used market — RTX 5090 to H200, with
            real price history and direct buy links.
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
        <section className="mt-10" aria-labelledby="movers-heading">
          <h2
            id="movers-heading"
            className="mb-3 font-mono text-xs tracking-widest text-mute uppercase"
          >
            Movers — 24h best price
          </h2>
          <div className="grid gap-px border border-edge bg-edge sm:grid-cols-2 lg:grid-cols-4">
            {movers.map(({ gpu, quote }) => (
              <Link
                key={gpu.slug}
                href={`/gpu/${gpu.slug}`}
                title={`${gpu.name} price — ${usd(quote.best!)}`}
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

      <section className="mt-10" aria-labelledby="board-heading">
        <h2
          id="board-heading"
          className="mb-3 font-mono text-xs tracking-widest text-mute uppercase"
        >
          All tracked parts
        </h2>
        <MarketBoard rows={rows} />
      </section>

      {headlineRental && (
        <section className="mt-12" aria-labelledby="rent-cta">
          <h2
            id="rent-cta"
            className="mb-3 font-mono text-xs tracking-widest text-mute uppercase"
          >
            Renting instead of buying
          </h2>
          <Link
            href="/rent"
            className="block border border-edge bg-panel px-5 py-5 transition-colors hover:bg-panel2"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <p className="max-w-2xl text-sm leading-relaxed text-ink2">
                The same silicon rents by the hour, and the spread between
                providers is far wider than anything on the retail board. The{" "}
                {headlineRental.model.name}{" "}
                {headlineRental.quote.bestAvailable ? "starts at" : "quotes"}{" "}
                <strong className="text-ink">
                  {perHour(headlineRental.quote.best!)}
                </strong>{" "}
                per GPU
                {headlineRental.quote.bestProviderId && (
                  <> at {providerById(headlineRental.quote.bestProviderId).name}</>
                )}
                {headlineRental.quote.bestCluster && (
                  <>
                    , and a full {headlineRental.quote.bestCluster.gpuCount}-GPU
                    node at{" "}
                    <strong className="text-ink">
                      {perHour(headlineRental.quote.bestCluster.nodeHour)}
                    </strong>
                  </>
                )}
                . Every GPU tracked on both sides shows a rent-vs-buy breakeven.
              </p>
              <span className="font-mono text-xs text-acc">
                {rentPriced.length} GPUs · {rentProviders.size} providers →
              </span>
            </div>
          </Link>
        </section>
      )}

      <section className="mt-16 border-t border-edge pt-10" aria-labelledby="about-heading">
        <h2 id="about-heading" className="text-xl font-semibold tracking-tight">
          {SITE_TAGLINE}
        </h2>
        <div className="mt-4 grid gap-6 text-sm leading-relaxed text-ink2 md:grid-cols-2">
          <p>
            This board tracks the <strong className="text-ink">street price</strong>{" "}
            of {all.length} graphics cards and AI accelerators — the price you
            can actually pay right now, not MSRP. Consumer cards like the
            GeForce RTX 5090, RTX 5080, RTX 5070 Ti and RTX 4090 sit alongside
            AMD&apos;s Radeon RX 9070 XT and RX 7900 XTX and Intel&apos;s Arc
            B580, so you can compare what every retailer is charging in one
            place before you buy.
          </p>
          <p>
            The same machinery covers the parts that don&apos;t have a retail
            shelf price: NVIDIA A100, H100 (PCIe, SXM and NVL), H200 and B200,
            AMD Instinct MI300X, MI325X and MI355X, and workstation cards like
            the RTX PRO 6000 and L40S. For those, the used and reseller market
            is the market — so eBay and refurb specialists are quoted right
            next to authorized Supermicro inventory.
          </p>
          <p>
            Every price on this page is the lowest matching listing at that
            source, filtered per part so waterblocks, barebones servers and
            8-GPU baseboards never pollute the series. Each sweep is recorded,
            which is how the{" "}
            <strong className="text-ink">24-hour, 7-day and 30-day moves</strong>{" "}
            and the per-source charts on every GPU page are built from real
            observations rather than estimates.
          </p>
          <p>
            {snapshotCount.toLocaleString("en-US")} price snapshots have been
            recorded so far across {liveSourceCount} live sources. Open any part
            on the board for its full price history, a source-by-source
            breakdown and direct links to the cheapest listing currently
            available.
          </p>
        </div>
      </section>

      <section className="mt-14" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="text-xl font-semibold tracking-tight">
          GPU price tracking FAQ
        </h2>
        <dl className="mt-5 grid gap-px border border-edge bg-edge md:grid-cols-2">
          {FAQ.map(({ q, a }) => (
            <div key={q} className="bg-panel px-5 py-4">
              <dt className="text-sm font-semibold text-ink">{q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-ink2">{a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
