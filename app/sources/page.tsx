import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { usd } from "@/lib/format";
import { GPUS } from "@/lib/gpus";
import { breadcrumbSchema, jsonLdGraph } from "@/lib/seo";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { SOURCES } from "@/lib/sources";
import { readHistory, readListings } from "@/lib/store";
import type { Source } from "@/lib/types";

export const dynamic = "force-dynamic";

const TITLE = "Where our GPU prices come from";
const DESCRIPTION =
  "Every retailer, reseller, marketplace and manufacturer store behind the price board — which are fetched live, which are read through official APIs, which block automated requests, and exactly what each one covers.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "GPU price sources",
    "where to buy GPUs",
    "GPU retailers compared",
    "Newegg GPU prices",
    "Micro Center GPU prices",
    "Supermicro GPU system prices",
    "used GPU marketplaces",
  ],
  alternates: { canonical: "/sources" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    url: "/sources",
    title: `${TITLE} | ${SITE_NAME}`,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | ${SITE_NAME}`,
    description: DESCRIPTION,
  },
};

const MODE_LABEL: Record<Source["mode"], string> = {
  scrape: "Fetched live",
  api: "Official API",
  link: "Link only",
};

const KIND_LABEL: Record<Source["kind"], string> = {
  retailer: "Retailer",
  reseller: "Reseller",
  marketplace: "Marketplace",
  oem: "Manufacturer",
};

export default function SourcesPage() {
  const history = readHistory();
  const listings = readListings();

  const stats = SOURCES.map((source) => {
    const covers = GPUS.filter((g) => g.sources.includes(source.id));
    const priced = covers.filter((g) => Object.keys(history[g.slug]?.[source.id] ?? {}).length > 0);
    const cheapest = covers
      .map((g) => listings[g.slug]?.[source.id]?.[0])
      .filter(Boolean)
      .sort((a, b) => a!.price - b!.price)[0];
    const snapshots = covers.reduce(
      (n, g) => n + Object.keys(history[g.slug]?.[source.id] ?? {}).length,
      0
    );
    return { source, covers: covers.length, priced: priced.length, snapshots, cheapest };
  });

  const live = stats.filter((s) => s.source.mode !== "link");
  const linkOnly = stats.filter((s) => s.source.mode === "link");
  const totalSnapshots = stats.reduce((n, s) => n + s.snapshots, 0);

  return (
    <div className="pt-8">
      <JsonLd
        data={jsonLdGraph(
          {
            "@type": "CollectionPage",
            name: TITLE,
            description: DESCRIPTION,
            url: absoluteUrl("/sources"),
          },
          {
            "@type": "ItemList",
            name: `Price sources used by ${SITE_NAME}`,
            numberOfItems: SOURCES.length,
            itemListElement: SOURCES.map((s, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: s.name,
              url: s.homepage,
            })),
          },
          breadcrumbSchema([
            { name: "GPU board", path: "/" },
            { name: "Sources", path: "/sources" },
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
          <li aria-current="page">sources</li>
        </ol>
      </nav>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        Sources<span className="text-acc">.</span>
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink2">
        Every price on this board is the lowest matching listing at one of the
        storefronts below, fetched on a schedule and recorded. Nothing is
        modeled, estimated or affiliate-weighted. Where a retailer refuses
        automated requests we say so and link you to their search instead of
        inventing a number.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-px border border-edge bg-edge sm:grid-cols-4">
        {[
          ["sources", String(SOURCES.length)],
          ["fetched live", String(live.length)],
          ["parts tracked", String(GPUS.length)],
          ["snapshots recorded", totalSnapshots.toLocaleString("en-US")],
        ].map(([label, value]) => (
          <div key={label} className="bg-panel px-4 py-3">
            <p className="font-mono text-2xl text-ink tabular-nums">{value}</p>
            <p className="mt-1 font-mono text-[11px] tracking-wider text-mute uppercase">
              {label}
            </p>
          </div>
        ))}
      </div>

      <Section
        id="live"
        heading="Priced sources"
        blurb="Fetched server-side on every sweep. These are the storefronts whose numbers become the price series and the charts."
        rows={live}
      />

      <Section
        id="link"
        heading="Link-only sources"
        blurb="These retailers refuse automated requests, so we never quote a price we can't verify. They still get a deep search link on every part they carry — often worth checking, especially in-store."
        rows={linkOnly}
      />

      <section className="mt-14" aria-labelledby="method-heading">
        <h2 id="method-heading" className="text-xl font-semibold tracking-tight">
          How a listing becomes a price
        </h2>
        <ol className="mt-4 grid gap-px border border-edge bg-edge md:grid-cols-2">
          {[
            ["Search", "Each source gets the query shape its own search engine actually responds to — some want the full product name, some return nothing unless you send the bare model number."],
            ["Match", "A per-part title regex, plus an exclusion regex that throws out waterblocks, barebones servers, NVLink bridges and multi-unit lots."],
            ["Sanity band", "Anything priced outside a per-part floor and ceiling is not that part. A $12 “RTX 5090” is a bracket."],
            ["Stock", "Listings the source marks unavailable are dropped — a price you can't pay isn't a price."],
            ["Outlier guard", "A listing far below the median of its own matched set is treated as bait or a mispriced SKU, not as the day's low."],
            ["Record", "The survivor's price accumulates into the day's low and high for that source, so the chart shows the real daily floor rather than whatever the last sweep happened to catch."],
          ].map(([step, text], i) => (
            <li key={step} className="bg-panel px-5 py-4">
              <p className="font-mono text-[11px] tracking-wider text-mute uppercase">
                Step {i + 1}
              </p>
              <p className="mt-1 text-sm font-semibold text-ink">{step}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink2">{text}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

type Row = {
  source: Source;
  covers: number;
  priced: number;
  snapshots: number;
  cheapest?: { title: string; price: number; url: string };
};

function Section({
  id,
  heading,
  blurb,
  rows,
}: {
  id: string;
  heading: string;
  blurb: string;
  rows: Row[];
}) {
  if (rows.length === 0) return null;
  return (
    <section className="mt-12" aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} className="text-xl font-semibold tracking-tight">
        {heading}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-ink2">{blurb}</p>

      <div className="mt-5 grid gap-px border border-edge bg-edge md:grid-cols-2">
        {rows.map(({ source, covers, priced, snapshots, cheapest }) => (
          <article key={source.id} className="flex flex-col bg-panel px-5 py-5">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="flex items-center gap-2.5 text-base font-semibold text-ink">
                <span
                  aria-hidden
                  className="inline-block h-2.5 w-2.5 shrink-0"
                  style={{ background: source.color }}
                />
                {source.name}
              </h3>
              <p className="shrink-0 font-mono text-[11px] tracking-wider text-mute uppercase">
                {KIND_LABEL[source.kind]}
              </p>
            </div>

            <p className="mt-1 font-mono text-[11px] text-acc">
              {MODE_LABEL[source.mode]}
              {source.mode === "api" && priced === 0 && " · needs API keys"}
            </p>

            <p className="mt-3 text-sm leading-relaxed text-ink2">{source.note}</p>

            <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] text-mute">
              <div>
                <dt className="inline tracking-wider uppercase">covers </dt>
                <dd className="inline text-ink tabular-nums">{covers} parts</dd>
              </div>
              {source.mode !== "link" && (
                <>
                  <div>
                    <dt className="inline tracking-wider uppercase">priced </dt>
                    <dd className="inline text-ink tabular-nums">{priced}</dd>
                  </div>
                  <div>
                    <dt className="inline tracking-wider uppercase">snapshots </dt>
                    <dd className="inline text-ink tabular-nums">{snapshots}</dd>
                  </div>
                </>
              )}
            </dl>

            {cheapest && (
              <p className="mt-3 border-t border-edge pt-3 text-xs text-ink2">
                Cheapest right now:{" "}
                <span className="font-mono text-ink tabular-nums">
                  {usd(cheapest.price)}
                </span>{" "}
                — <span className="line-clamp-1 inline">{cheapest.title}</span>
              </p>
            )}

            <div className="mt-auto pt-4">
              <a
                href={source.homepage}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-block border border-edge2 px-3 py-1.5 font-mono text-xs text-ink transition-colors hover:border-acc hover:text-acc"
              >
                Visit {source.name} ↗
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
