import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Delta from "@/components/Delta";
import JsonLd from "@/components/JsonLd";
import LiveStatus from "@/components/LiveStatus";
import PriceChart, { type ChartSeries } from "@/components/PriceChart";
import {
  breakevenHours,
  humanHours,
  pct,
  perHour,
  rate,
  usd,
} from "@/lib/format";
import { gpuBySlug } from "@/lib/gpus";
import { buildQuote } from "@/lib/quotes";
import { RENT_MODELS, rentModelBySlug, TIER_LABEL } from "@/lib/rentals/models";
import { MAX_CHART_SERIES, rentColor } from "@/lib/rentals/palette";
import { KIND_LABEL, providerById } from "@/lib/rentals/providers";
import { buildRentalQuote } from "@/lib/rentals/quotes";
import type { RentalQuote, RentModel } from "@/lib/rentals/types";
import {
  breadcrumbSchema,
  jsonLdGraph,
  rentalServiceSchema,
} from "@/lib/seo";
import { SITE_NAME } from "@/lib/site";
import { readRentalMeta } from "@/lib/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ model: string }> };

/** Title and description both lead with the live rate — that's the snippet. */
function seoCopy(model: RentModel, quote: RentalQuote) {
  const priced = quote.best !== null;
  const provider = quote.bestProviderId
    ? providerById(quote.bestProviderId).name
    : null;

  const title = priced
    ? `${model.name} Rental Price — ${rate(quote.best!)}/hr (Live${
        provider ? `, ${provider}` : ""
      })`
    : `${model.name} Cloud Rental Price — Live Tracker`;

  // Never promise a bookable rate in a snippet when nothing has capacity. Only
  // meaningful once something is priced at all — `best` is null before that.
  const at = provider ? ` at ${provider}` : "";
  const opener = !priced
    ? ""
    : quote.bestAvailable
      ? `Rent an ${model.name} from ${rate(quote.best!)} per GPU-hour${at}.`
      : `${model.name} cloud capacity is currently sold out across every tracked provider; the cheapest quoted rate is ${rate(
          quote.best!
        )} per GPU-hour${at}.`;

  const move = quote.delta24h !== null ? ` ${pct(quote.delta24h)} in 24h.` : "";

  const cluster = quote.bestCluster
    ? ` Cheapest ${quote.bestCluster.gpuCount}-GPU node ${perHour(
        quote.bestCluster.nodeHour
      )}.`
    : "";

  const description = priced
    ? `${opener}${move}${cluster} Compare live hourly rates across ${
        quote.providerCount
      } GPU clouds, with real rate history and rent-vs-buy breakeven.`
    : `Track live ${model.name} cloud rental rates (${model.vram}, ${model.arch}) across every GPU cloud that publishes a price, with hourly rate history and rent-vs-buy breakeven.`;

  return { title, description };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { model: slug } = await params;
  const model = rentModelBySlug(slug);

  if (!model) {
    return { title: "GPU not found", robots: { index: false, follow: true } };
  }

  const quote = buildRentalQuote(model);
  const { title, description } = seoCopy(model, quote);
  const path = `/rent/${model.slug}`;

  return {
    title,
    description,
    keywords: [
      `${model.name} rental price`,
      `rent ${model.name}`,
      `${model.name} per hour`,
      `${model.name} cloud price`,
      `${model.ticker} hourly rate`,
      `cheapest ${model.name} cloud`,
      `8x ${model.name} node price`,
      `${model.name} rent vs buy`,
    ],
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_US",
      url: path,
      title: `${title} | ${SITE_NAME}`,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE_NAME}`,
      description,
    },
  };
}

export default async function RentModelPage({ params }: Props) {
  const { model: slug } = await params;
  const model = rentModelBySlug(slug);
  if (!model) notFound();

  const quote = buildRentalQuote(model);
  const meta = readRentalMeta();
  const { description } = seoCopy(model, quote);

  // The chart colors by rank, cheapest first — see lib/rentals/palette.ts for
  // why identity colors don't survive twenty-three providers.
  const series: ChartSeries[] = quote.rates
    .filter((r) => r.points.length > 0)
    .slice(0, MAX_CHART_SERIES)
    .map((r, i) => ({
      id: r.providerId,
      name: providerById(r.providerId).name,
      color: rentColor(i),
      points: r.points,
    }));

  // Rent-vs-buy only exists where the same silicon is tracked on both sides.
  const buyGpu = model.buySlug ? gpuBySlug(model.buySlug) : undefined;
  const buyQuote = buyGpu ? buildQuote(buyGpu) : null;
  const breakeven =
    buyQuote?.best != null && quote.best !== null
      ? breakevenHours(buyQuote.best, quote.best)
      : null;

  // Multi-GPU configurations, one row per distinct shape. A peer-to-peer pool
  // returns the same shape from dozens of hosts, so the cheapest of each
  // (provider, GPU count, interconnect) stands for it — otherwise a single
  // provider fills the whole table with near-identical rows.
  const clusters = [
    ...quote.rates
      .flatMap((r) => r.offers)
      .filter((o) => o.gpuCount > 1)
      .sort((a, b) => a.perGpuHour - b.perGpuHour)
      .reduce((seen, o) => {
        const shape = `${o.providerId}|${o.gpuCount}|${o.interconnect ?? ""}`;
        if (!seen.has(shape)) seen.set(shape, o);
        return seen;
      }, new Map<string, (typeof quote.rates)[number]["offers"][number]>())
      .values(),
  ].slice(0, 12);

  const specs = [
    ["VRAM", model.vram],
    ["Architecture", model.arch],
    ["Segment", TIER_LABEL[model.tier]],
    [
      "Providers quoting",
      quote.providerCount > 0 ? String(quote.providerCount) : "—",
    ],
  ] as const;

  const related = RENT_MODELS.filter(
    (m) => m.tier === model.tier && m.slug !== model.slug
  ).slice(0, 6);

  return (
    <div className="pt-8">
      <JsonLd
        data={jsonLdGraph(
          rentalServiceSchema(model, quote, description),
          breadcrumbSchema([
            { name: "GPU board", path: "/" },
            { name: "Rental market", path: "/rent" },
            { name: model.name, path: `/rent/${model.slug}` },
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
          <li>
            <Link href="/rent" className="hover:text-acc">
              rent
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page">{model.ticker}</li>
        </ol>
      </nav>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">
              {model.name} rental price
            </h1>
            <span className="border border-edge2 px-2 py-0.5 font-mono text-[11px] tracking-wider text-ink2 uppercase">
              {TIER_LABEL[model.tier]}
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-ink2">{model.blurb}</p>
        </div>
        <LiveStatus lastRefresh={meta.lastRefresh} rentals />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-px border border-edge bg-edge sm:grid-cols-4">
        {specs.map(([k, v]) => (
          <div key={k} className="bg-panel px-4 py-3">
            <p className="font-mono text-[11px] tracking-wider text-mute uppercase">
              {k}
            </p>
            <p className="mt-1 text-sm text-ink">{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-end gap-x-10 gap-y-4">
        <div>
          <p className="font-mono text-[11px] tracking-wider text-mute uppercase">
            best rate
          </p>
          {quote.best !== null ? (
            <p className="mt-1 flex items-baseline gap-3">
              <span className="font-mono text-4xl text-ink tabular-nums">
                {rate(quote.best)}
              </span>
              <span className="font-mono text-xs text-ink2">
                /GPU-hr
                {quote.bestProviderId &&
                  ` ${quote.bestAvailable ? "at" : "at (sold out)"} ${
                    providerById(quote.bestProviderId).name
                  }`}
              </span>
            </p>
          ) : (
            <p className="mt-1 font-mono text-2xl text-mute">no quotes yet</p>
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
        {quote.bestCluster && (
          <div>
            <p className="font-mono text-[11px] tracking-wider text-mute uppercase">
              cheapest {quote.bestCluster.gpuCount}× node
            </p>
            <p className="mt-1 font-mono text-xl text-ink tabular-nums">
              {perHour(quote.bestCluster.nodeHour)}
            </p>
          </div>
        )}
      </div>

      {/* A one-line answer for the query that brought the visitor here. */}
      <p className="mt-6 max-w-3xl text-sm leading-relaxed text-ink2">
        {quote.best !== null ? (
          <>
            {quote.bestAvailable
              ? `The cheapest ${model.name} you can rent right now is `
              : `Every provider quoting the ${model.name} is currently out of capacity. The cheapest rate on the board is `}
            <strong className="text-ink">{rate(quote.best)} per GPU-hour</strong>
            {quote.bestProviderId && (
              <> at {providerById(quote.bestProviderId).name}</>
            )}
            {quote.spreadHigh !== null && quote.spreadHigh > quote.best && (
              <>
                , against {rate(quote.spreadHigh)} at the dearest of the{" "}
                {quote.providerCount} providers quoting it — a{" "}
                <strong className="text-ink">
                  {(quote.spreadHigh / quote.best).toFixed(1)}×
                </strong>{" "}
                spread for identical silicon
              </>
            )}
            .{" "}
            {quote.bestCluster && (
              <>
                A full {quote.bestCluster.gpuCount}-GPU node starts at{" "}
                <strong className="text-ink">
                  {perHour(quote.bestCluster.nodeHour)}
                </strong>{" "}
                at {providerById(quote.bestCluster.providerId).name}.{" "}
              </>
            )}
            Rates below refresh automatically.
          </>
        ) : (
          <>
            No provider is quoting the {model.name} right now — on the rental
            market that usually means sold out rather than untracked. The board
            sweeps every provider continuously and the rate reappears here as
            soon as capacity does.
          </>
        )}
      </p>

      {breakeven !== null && buyGpu && buyQuote?.best != null && (
        <section className="mt-8" aria-labelledby="breakeven-heading">
          <h2
            id="breakeven-heading"
            className="mb-3 font-mono text-xs tracking-widest text-mute uppercase"
          >
            Rent vs. buy
          </h2>
          <div className="border border-edge bg-panel px-5 py-4">
            <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
              <div>
                <p className="font-mono text-[11px] tracking-wider text-mute uppercase">
                  buy outright
                </p>
                <p className="mt-1 font-mono text-2xl text-ink tabular-nums">
                  {usd(buyQuote.best)}
                </p>
              </div>
              <div>
                <p className="font-mono text-[11px] tracking-wider text-mute uppercase">
                  rent
                </p>
                <p className="mt-1 font-mono text-2xl text-ink tabular-nums">
                  {rate(quote.best!)}
                  <span className="text-sm text-mute">/hr</span>
                </p>
              </div>
              <div>
                <p className="font-mono text-[11px] tracking-wider text-mute uppercase">
                  breakeven
                </p>
                <p className="mt-1 font-mono text-2xl text-acc tabular-nums">
                  {humanHours(breakeven)}
                </p>
              </div>
            </div>
            <p className="mt-4 max-w-3xl text-xs leading-relaxed text-ink2">
              Buying a {buyGpu.name} at today&rsquo;s street price of{" "}
              {usd(buyQuote.best)} costs the same as{" "}
              <strong className="text-ink">
                {Math.round(breakeven).toLocaleString("en-US")} hours
              </strong>{" "}
              ({humanHours(breakeven)}) of renting one at {rate(quote.best!)} an
              hour. Run it less than that and renting is simply cheaper; run it
              more and the card starts paying itself back — but this is a floor,
              not a total cost of ownership. It counts only the purchase price
              against the rental rate, and ignores power, cooling, rack space,
              networking, depreciation and the cost of tying up the capital,
              all of which push the real breakeven further out.
            </p>
            <Link
              href={`/gpu/${buyGpu.slug}`}
              className="mt-3 inline-block font-mono text-xs text-mute transition-colors hover:text-acc"
            >
              {buyGpu.name} purchase prices and history →
            </Link>
          </div>
        </section>
      )}

      <section className="mt-10" aria-labelledby="rate-history">
        <h2
          id="rate-history"
          className="mb-3 font-mono text-xs tracking-widest text-mute uppercase"
        >
          {model.ticker} hourly rate history
        </h2>
        <PriceChart
          series={series}
          format="rate"
          ariaLabel={`${model.name} hourly rental rate history by provider`}
          emptyLabel="No rate snapshots yet — the first sweep starts the history."
        />
        <p className="mt-2 font-mono text-[11px] text-mute">
          Daily low $/GPU-hour per provider, cheapest provider first
          {quote.rates.length > MAX_CHART_SERIES &&
            ` · showing ${MAX_CHART_SERIES} of ${quote.rates.length} providers`}{" "}
          — hover the chart for detail.
        </p>
      </section>

      <section className="mt-10" aria-labelledby="providers-heading">
        <h2
          id="providers-heading"
          className="mb-3 font-mono text-xs tracking-widest text-mute uppercase"
        >
          Where to rent the {model.name}
        </h2>
        {quote.rates.filter((r) => r.offers.length > 0).length === 0 ? (
          <p className="border border-edge bg-panel px-5 py-6 text-center font-mono text-sm text-mute">
            No provider is quoting this GPU right now.
          </p>
        ) : (
          <div className="grid gap-px border border-edge bg-edge md:grid-cols-2">
            {quote.rates
              .filter((r) => r.offers.length > 0)
              .map((r, i) => {
                const provider = providerById(r.providerId);
                const cheapest = r.offer;
                return (
                  <div
                    key={r.providerId}
                    className="flex flex-col bg-panel px-5 py-4"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="flex items-center gap-2 text-sm text-ink">
                        <span
                          aria-hidden
                          className="inline-block h-2 w-2"
                          style={{
                            background:
                              i < MAX_CHART_SERIES
                                ? rentColor(i)
                                : "var(--color-mute)",
                          }}
                        />
                        {provider.name}
                      </h3>
                      <p className="font-mono text-[11px] text-mute">
                        {KIND_LABEL[provider.kind]}
                      </p>
                    </div>

                    <p className="mt-3 font-mono text-2xl text-ink tabular-nums">
                      {rate(r.perGpuHour)}
                      <span className="text-sm text-mute">/GPU-hr</span>
                    </p>
                    <p className="mt-1 text-xs text-ink2">
                      {cheapest.gpuCount}× {model.ticker} ·{" "}
                      {perHour(cheapest.nodeHour)} per node
                      {cheapest.interconnect && ` · ${cheapest.interconnect}`}
                      {cheapest.region && ` · ${cheapest.region}`}
                    </p>
                    {r.bookable === null && (
                      <p className="mt-1 font-mono text-[11px] text-neg">
                        no capacity right now
                      </p>
                    )}

                    {r.offers.length > 1 && (
                      <ul className="mt-3 space-y-1 border-t border-edge pt-2">
                        {r.offers.slice(1, 4).map((o, n) => (
                          <li
                            key={`${o.instance}-${o.gpuCount}-${n}`}
                            className="flex items-baseline gap-2 font-mono text-xs"
                          >
                            <span className="flex-1 truncate text-ink2">
                              {o.gpuCount}× {o.instance}
                              {o.available === false && (
                                <span className="text-mute"> · no capacity</span>
                              )}
                            </span>
                            <span className="text-ink tabular-nums">
                              {perHour(o.nodeHour)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-auto pt-4">
                      <a
                        href={cheapest.url ?? provider.rentUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow sponsored"
                        aria-label={`Rent the ${model.name} at ${provider.name} from ${rate(
                          r.perGpuHour
                        )} per GPU-hour`}
                        className="inline-block border border-edge2 px-3 py-1.5 font-mono text-xs text-ink transition-colors hover:border-acc hover:text-acc"
                      >
                        Rent at {provider.name} ↗
                      </a>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </section>

      {clusters.length > 0 && (
        <section className="mt-12" aria-labelledby="clusters-heading">
          <h2
            id="clusters-heading"
            className="mb-3 font-mono text-xs tracking-widest text-mute uppercase"
          >
            {model.ticker} cluster nodes
          </h2>
          <p className="mb-3 max-w-3xl text-sm text-ink2">
            Multi-GPU configurations, cheapest per GPU-hour first. For
            distributed training the interconnect matters as much as the rate —
            an NVLink or InfiniBand node and the same count of loose PCIe cards
            are not the same machine.
          </p>
          <div className="overflow-x-auto border border-edge">
            <table className="w-full min-w-[680px] border-collapse">
              <thead>
                <tr className="border-b border-edge bg-panel text-left font-mono text-[11px] tracking-wider text-mute uppercase">
                  <th className="px-4 py-2 font-normal">Provider</th>
                  <th className="px-4 py-2 font-normal">Configuration</th>
                  <th className="px-4 py-2 font-normal">Interconnect</th>
                  <th className="px-4 py-2 text-right font-normal">$/GPU-hr</th>
                  <th className="px-4 py-2 text-right font-normal">Node/hr</th>
                </tr>
              </thead>
              <tbody>
                {clusters.map((o, n) => (
                  <tr
                    key={`${o.providerId}-${o.gpuCount}-${n}`}
                    className="border-b border-edge bg-panel last:border-b-0"
                  >
                    <td className="px-4 py-3 text-sm text-ink">
                      {providerById(o.providerId).name}
                      {o.available === false && (
                        <span className="ml-2 font-mono text-[11px] text-mute">
                          no capacity
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink2">
                      {o.gpuCount}× {o.instance}
                      {o.region && (
                        <span className="text-mute"> · {o.region}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink2">
                      {o.interconnect ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-ink tabular-nums">
                      {rate(o.perGpuHour)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-ink tabular-nums">
                      {perHour(o.nodeHour)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-12" aria-labelledby="related-rent">
          <h2
            id="related-rent"
            className="mb-3 font-mono text-xs tracking-widest text-mute uppercase"
          >
            Compare with other {TIER_LABEL[model.tier].toLowerCase()} GPUs
          </h2>
          <ul className="flex flex-wrap gap-px border border-edge bg-edge">
            {related.map((m) => (
              <li key={m.slug} className="flex-1 bg-panel">
                <Link
                  href={`/rent/${m.slug}`}
                  title={`${m.name} hourly rental price`}
                  className="block px-4 py-3 whitespace-nowrap transition-colors hover:bg-panel2"
                >
                  <span className="font-mono text-xs text-acc">{m.ticker}</span>
                  <span className="mt-1 block text-xs text-ink2">
                    rent {m.name}
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
