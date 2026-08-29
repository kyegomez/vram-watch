import { RENTAL_ADAPTERS } from "../lib/rentals/adapters";
import { RENT_MODELS, rentModelBySlug } from "../lib/rentals/models";
import { providerById } from "../lib/rentals/providers";
import { refreshRentals } from "../lib/rentals/refresh";
import { getAllRentalQuotes } from "../lib/rentals/quotes";

/**
 * Rental market diagnostics.
 *
 *   pnpm rent            run a sweep and report what every provider quoted
 *   pnpm rent raw        per-adapter fetch only, with rate-band rejections
 *   pnpm rent <model>    every live offer for one model, cheapest first
 */

const hr = (n: number) => `$${n.toFixed(n < 10 ? 3 : 2)}/hr`;

async function raw() {
  for (const adapter of RENTAL_ADAPTERS) {
    const t0 = Date.now();
    try {
      const offers = await adapter.fetchOffers();
      const ms = Date.now() - t0;
      const kept = offers.filter((o) => {
        const m = rentModelBySlug(o.modelSlug);
        return m && o.perGpuHour >= m.rateMin && o.perGpuHour <= m.rateMax;
      });
      console.log(
        `\n${adapter.id.padEnd(11)} ${String(offers.length).padStart(4)} offers` +
          ` · ${kept.length} in band · ${ms}ms` +
          ` · ${new Set(offers.map((o) => o.providerId)).size} providers`
      );
      for (const o of offers) {
        const m = rentModelBySlug(o.modelSlug);
        if (m && o.perGpuHour >= m.rateMin && o.perGpuHour <= m.rateMax) continue;
        console.log(
          `  REJECT ${o.providerId}/${o.modelSlug} ${o.instance} ` +
            `x${o.gpuCount} node=${hr(o.nodeHour)} perGpu=${hr(o.perGpuHour)}` +
            (m ? ` band=[${m.rateMin}, ${m.rateMax}]` : " (unknown model)")
        );
      }
    } catch (e) {
      console.log(`\n${adapter.id.padEnd(11)} FAILED: ${(e as Error).message}`);
    }
  }
}

async function model(slug: string) {
  const m = rentModelBySlug(slug);
  if (!m) {
    console.log(`Unknown model "${slug}". Known:`);
    console.log(RENT_MODELS.map((x) => `  ${x.slug}`).join("\n"));
    return;
  }
  await refreshRentals();
  const { quote } = getAllRentalQuotes().find((q) => q.model.slug === slug)!;
  console.log(`\n${m.name} — ${quote.providerCount} providers quoting\n`);
  for (const rate of quote.rates) {
    if (rate.offers.length === 0) continue;
    console.log(providerById(rate.providerId).name);
    for (const o of rate.offers) {
      console.log(
        `  ${hr(o.perGpuHour).padStart(11)}/GPU  x${String(o.gpuCount).padEnd(2)}` +
          ` node ${hr(o.nodeHour).padStart(11)}  ${o.instance}` +
          `${o.region ? ` · ${o.region}` : ""}` +
          `${o.available === false ? " · no capacity" : ""}` +
          `${o.spot ? " · spot" : ""}`
      );
    }
  }
}

async function sweep() {
  const t0 = Date.now();
  const result = await refreshRentals();
  console.log(
    `\nswept in ${((Date.now() - t0) / 1000).toFixed(1)}s — ` +
      `${result.rates} rates from ${result.providers} providers`
  );
  for (const [id, msg] of Object.entries(result.errors)) {
    console.log(`  ERROR ${id}: ${msg}`);
  }

  console.log(
    "\nmodel          best/GPU-hr  provider           spread  8x node    n" +
      "\n(! = no provider has capacity at that rate)"
  );
  for (const { model: m, quote } of getAllRentalQuotes()) {
    if (quote.best === null) {
      console.log(`${m.ticker.padEnd(14)} ${"no quotes".padStart(11)}`);
      continue;
    }
    const cluster = quote.bestCluster;
    console.log(
      `${m.ticker.padEnd(14)} ${hr(quote.best).padStart(11)}${
        quote.bestAvailable ? " " : "!"
      } ` +
        `${providerById(quote.bestProviderId!).name.padEnd(18)} ` +
        `${quote.spreadHigh ? `${(quote.spreadHigh / quote.best).toFixed(1)}x` : "  — "}  ` +
        `${cluster ? hr(cluster.nodeHour).padStart(9) : "        —"}  ` +
        `${String(quote.providerCount).padStart(2)}`
    );
  }
}

const arg = process.argv[2];
const run = arg === "raw" ? raw() : arg ? model(arg) : sweep();
run.catch((e) => {
  console.error(e);
  process.exit(1);
});
