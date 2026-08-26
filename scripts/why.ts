/** Explain, per listing, exactly which filter rejected it. */
import { central } from "../lib/adapters/central";
import { newegg } from "../lib/adapters/newegg";
import { pcsp } from "../lib/adapters/pcsp";
import { serverpartdeals, techmikeny } from "../lib/adapters/shopify";
import { supermicro } from "../lib/adapters/supermicro";
import { wiredzone } from "../lib/adapters/wiredzone";
import { gpuBySlug } from "../lib/gpus";
import { queryFor } from "../lib/refresh";
import { sourceById } from "../lib/sources";
import type { SourceAdapter } from "../lib/types";

const A: Record<string, SourceAdapter> = {
  newegg,
  central,
  wiredzone,
  pcsp,
  techmikeny,
  serverpartdeals,
  supermicro,
};
const USED = /\bused\b|refurb|open box|renewed|pre-owned/i;

async function main() {
  const gpu = gpuBySlug(process.argv[2])!;
  const source = sourceById(process.argv[3]);
  const q = queryFor(gpu, source);
  const all = await A[source.id].fetchListings(q);
  console.log(`${gpu.slug} @ ${source.id} — query "${q}" → ${all.length} raw\n`);
  for (const l of all.slice(0, 12)) {
    const t = l.title.toLowerCase();
    const why: string[] = [];
    if (l.inStock === false) why.push("out-of-stock");
    if (!new RegExp(gpu.match, "i").test(t)) why.push(`no match /${gpu.match}/`);
    const ex = new RegExp(gpu.exclude, "i").exec(t);
    if (ex) why.push(`excluded on "${ex[0]}"`);
    const usedOk = gpu.usedOk || source.usedSource || source.kind === "marketplace";
    if (!usedOk && USED.test(t)) why.push("used");
    if (l.price < gpu.priceMin) why.push(`< $${gpu.priceMin}`);
    if (l.price > gpu.priceMax) why.push(`> $${gpu.priceMax}`);
    console.log(`${why.length ? "✗" : "✓"} $${String(l.price).padEnd(10)} ${l.title.slice(0, 62)}`);
    if (why.length) console.log(`    ${why.join("; ")}`);
  }
}
main();
