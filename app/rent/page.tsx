import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import LiveStatus from "@/components/LiveStatus";
import RentBoard, { type RentRow } from "@/components/RentBoard";
import { perHour, rate } from "@/lib/format";
import { PROVIDERS, providerById } from "@/lib/rentals/providers";
import { getAllRentalQuotes } from "@/lib/rentals/quotes";
import { faqSchema, jsonLdGraph, rentBoardItemListSchema } from "@/lib/seo";
import {
  RENT_DESCRIPTION,
  RENT_DESCRIPTION_SHORT,
  RENT_KEYWORDS,
  RENT_TITLE,
  SITE_NAME,
} from "@/lib/site";
import { readRentalHistory, readRentalMeta } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: RENT_TITLE },
  description: RENT_DESCRIPTION,
  keywords: RENT_KEYWORDS,
  alternates: { canonical: "/rent" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    url: "/rent",
    title: RENT_TITLE,
    description: RENT_DESCRIPTION_SHORT,
  },
  twitter: {
    card: "summary_large_image",
    title: RENT_TITLE,
    description: RENT_DESCRIPTION_SHORT,
  },
};

/** Visible copy and FAQPage markup read from the same array — never drift. */
const FAQ = [
  {
    q: "How much does it cost to rent an H100 per hour?",
    a: "It depends entirely on who you rent from, and the spread is enormous — on this board the dearest provider is routinely five to eight times the cheapest for the same GPU. Peer-to-peer hosts on Vast.ai sit at the bottom, dedicated GPU clouds like Voltage Park, Lambda and Crusoe in the middle, and AWS and Azure list prices at the top. The board shows the current low per GPU-hour and every provider quoting it.",
  },
  {
    q: "Are these GPU rental prices real-time?",
    a: "Yes. Every provider here is fetched live server-side on a rolling sweep — AWS's public pricing feed, Azure's Retail Prices API, RunPod's GraphQL endpoint, Vast.ai's marketplace listings, and Shadeform's catalog for a dozen-plus dedicated GPU clouds. Nothing on this board is estimated, modeled or hand-entered.",
  },
  {
    q: "What does $/GPU-hour mean, and why not the node price?",
    a: "Providers sell very different shapes — a single GPU on RunPod, an 8-way NVLink node on Lambda, a 96-vCPU instance on AWS. Dividing the node's hourly price by the number of GPUs attached gives one number that compares across all of them. The node price is shown too, since that is what you are actually billed and the only honest way to price a cluster.",
  },
  {
    q: "How do I price an 8-GPU cluster node?",
    a: "Each GPU's page lists every multi-GPU configuration on offer with its full node rate, so you can see the cheapest 8x H100 or 8x B200 box per hour and which provider has capacity for it. Interconnect matters as much as price for training: an NVLink or InfiniBand-connected node and eight loose PCIe cards are not the same product, so both are labelled.",
  },
  {
    q: "Is it cheaper to rent or buy a GPU?",
    a: "Every GPU tracked on both sides of this site shows a breakeven — the number of hours of rental that cost the same as buying the card outright at its current street price. Below that many hours, renting wins outright. Above it, buying starts to pay back, though the breakeven ignores power, cooling, networking and the cost of capital, so it is a floor rather than a full comparison.",
  },
  {
    q: "Why is Vast.ai so much cheaper than AWS?",
    a: "They are not the same product. Vast.ai is a peer-to-peer market where independent hosts rent out their own machines and set their own prices, with wide variation in reliability, location, bandwidth and how long a machine stays up. AWS sells guaranteed capacity with an SLA, enterprise networking and a support contract. The board quotes both honestly and labels which is which.",
  },
];

export default function RentPage() {
  const all = getAllRentalQuotes();
  const meta = readRentalMeta();
  const history = readRentalHistory();

  const snapshotCount = Object.values(history).reduce(
    (n, byProvider) =>
      n +
      Object.values(byProvider).reduce((m, days) => m + Object.keys(days).length, 0),
    0
  );

  const quotingProviders = new Set(
    all.flatMap(({ quote }) =>
      quote.rates.filter((r) => r.offers.length > 0).map((r) => r.providerId)
    )
  );

  const priced = all.filter(({ quote }) => quote.best !== null);

  // The single most useful number on the page: how much the same GPU-hour
  // varies between the cheapest and dearest provider quoting it right now.
  const widest = priced
    .filter(({ quote }) => quote.spreadHigh !== null && quote.best! > 0)
    .sort(
      (a, b) =>
        b.quote.spreadHigh! / b.quote.best! - a.quote.spreadHigh! / a.quote.best!
    )[0];

  const movers = priced
    .filter(({ quote }) => quote.delta24h !== null)
    .sort((a, b) => a.quote.delta24h! - b.quote.delta24h!)
    .slice(0, 4);

  const rows: RentRow[] = all.map(({ model, quote }) => ({
    slug: model.slug,
    ticker: model.ticker,
    name: model.name,
    tier: model.tier,
    vram: model.vram,
    best: quote.best,
    bestProviderName: quote.bestProviderId
      ? providerById(quote.bestProviderId).name
      : null,
    bestAvailable: quote.bestAvailable,
    spreadHigh: quote.spreadHigh,
    clusterHour: quote.bestCluster?.nodeHour ?? null,
    clusterGpus: quote.bestCluster?.gpuCount ?? null,
    clusterProviderName: quote.bestCluster
      ? providerById(quote.bestCluster.providerId).name
      : null,
    delta24h: quote.delta24h,
    delta7d: quote.delta7d,
    spark: quote.spark,
    providerCount: quote.providerCount,
  }));

  return (
    <div className="pt-10">
      <JsonLd
        data={jsonLdGraph(
          {
            "@type": "CollectionPage",
            name: RENT_TITLE,
            description: RENT_DESCRIPTION,
            url: "/rent",
          },
          rentBoardItemListSchema(all),
          faqSchema(FAQ)
        )}
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            GPU Rental Market<span className="text-acc">.</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-ink2">
            What the same silicon costs by the hour, across every cloud that
            publishes a price — from peer-to-peer hosts to the hyperscalers.
            Priced per GPU-hour so the shapes compare, and per node so you can
            cost a cluster.
          </p>
        </div>
        <LiveStatus lastRefresh={meta.lastRefresh} rentals />
      </div>

      <div className="mt-8 grid grid-cols-2 gap-px border border-edge bg-edge sm:grid-cols-4">
        {[
          { label: "GPUs tracked", value: String(all.length) },
          { label: "providers quoting", value: String(quotingProviders.size) },
          { label: "snapshots recorded", value: String(snapshotCount) },
          { label: "priced now", value: String(priced.length) },
        ].map((t) => (
          <div key={t.label} className="bg-panel px-4 py-3">
            <p className="font-mono text-[11px] tracking-wider text-mute uppercase">
              {t.label}
            </p>
            <p className="mt-1 font-mono text-xl text-ink tabular-nums">
              {t.value}
            </p>
          </div>
        ))}
      </div>

      {widest && (
        <p className="mt-6 max-w-3xl text-sm leading-relaxed text-ink2">
          The same GPU-hour is not one price. Right now the widest spread on the
          board is the{" "}
          <Link href={`/rent/${widest.model.slug}`} className="text-acc hover:underline">
            {widest.model.name}
          </Link>
          : {rate(widest.quote.best!)} per GPU-hour at{" "}
          {providerById(widest.quote.bestProviderId!).name} against{" "}
          {rate(widest.quote.spreadHigh!)} at the dearest provider quoting it —
          a{" "}
          <strong className="text-ink">
            {(widest.quote.spreadHigh! / widest.quote.best!).toFixed(1)}×
          </strong>{" "}
          difference for the same silicon, before anyone has run a single token
          through it.
        </p>
      )}

      {movers.length > 0 && (
        <section className="mt-8" aria-labelledby="rent-movers">
          <h2
            id="rent-movers"
            className="mb-3 font-mono text-xs tracking-widest text-mute uppercase"
          >
            Biggest 24h rate moves
          </h2>
          <div className="grid gap-px border border-edge bg-edge sm:grid-cols-2 lg:grid-cols-4">
            {movers.map(({ model, quote }) => (
              <Link
                key={model.slug}
                href={`/rent/${model.slug}`}
                className="bg-panel px-4 py-3 transition-colors hover:bg-panel2"
              >
                <p className="font-mono text-xs text-acc">{model.ticker}</p>
                <p className="mt-1 font-mono text-lg text-ink tabular-nums">
                  {perHour(quote.best!)}
                </p>
                <p
                  className={`mt-1 font-mono text-xs ${
                    quote.delta24h! < 0 ? "text-acc" : "text-neg"
                  }`}
                >
                  {quote.delta24h! > 0 ? "+" : ""}
                  {(quote.delta24h! * 100).toFixed(1)}% · 24h
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-10">
        <RentBoard rows={rows} />
      </div>

      <section className="mt-14" aria-labelledby="rent-providers">
        <h2
          id="rent-providers"
          className="mb-3 font-mono text-xs tracking-widest text-mute uppercase"
        >
          Where the rates come from
        </h2>
        <p className="mb-4 max-w-3xl text-sm text-ink2">
          Five live feeds cover every provider on this board. Four talk to one
          provider each; the fifth reads Shadeform&rsquo;s public catalog, which
          publishes live rates and per-region availability for a dozen-plus GPU
          clouds that have no pricing API of their own. Rates are always
          attributed to the cloud that charges them.
        </p>
        <div className="grid gap-px border border-edge bg-edge md:grid-cols-2">
          {PROVIDERS.map((p) => (
            <div key={p.id} className="bg-panel px-5 py-4">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-sm text-ink">{p.name}</h3>
                <span className="font-mono text-[11px] text-mute">
                  {p.via === "shadeform" ? "via Shadeform catalog" : "direct feed"}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-ink2">{p.note}</p>
              <a
                href={p.rentUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="mt-3 inline-block font-mono text-[11px] text-mute transition-colors hover:text-acc"
              >
                {p.name} pricing ↗
              </a>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14" aria-labelledby="rent-faq">
        <h2
          id="rent-faq"
          className="mb-3 font-mono text-xs tracking-widest text-mute uppercase"
        >
          GPU rental pricing, answered
        </h2>
        <div className="grid gap-px border border-edge bg-edge md:grid-cols-2">
          {FAQ.map((f) => (
            <div key={f.q} className="bg-panel px-5 py-4">
              <h3 className="text-sm text-ink">{f.q}</h3>
              <p className="mt-2 text-xs leading-relaxed text-ink2">{f.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
