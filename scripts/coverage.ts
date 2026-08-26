/**
 * Coverage harness: for every (GPU, source), fetch with one or more candidate
 * queries and report how many listings survive the real filter gate.
 *
 *   pnpm exec tsx scripts/coverage.ts [sourceId ...]
 */
import { central } from "../lib/adapters/central";
import { newegg } from "../lib/adapters/newegg";
import { pcsp } from "../lib/adapters/pcsp";
import { serverpartdeals, techmikeny } from "../lib/adapters/shopify";
import { supermicro } from "../lib/adapters/supermicro";
import { wiredzone } from "../lib/adapters/wiredzone";
import { sleep } from "../lib/adapters/http";
import { GPUS } from "../lib/gpus";
import { sourceById } from "../lib/sources";
import type { Gpu, Listing, Source, SourceAdapter } from "../lib/types";

const ADAPTERS: Record<string, SourceAdapter> = {
  newegg,
  central,
  wiredzone,
  pcsp,
  techmikeny,
  serverpartdeals,
  supermicro,
};

const USED = /\bused\b|refurb|open box|renewed|pre-owned/i;
function matches(gpu: Gpu, l: Listing, source: Source): boolean {
  if (l.inStock === false) return false;
  const t = l.title.toLowerCase();
  if (!new RegExp(gpu.match, "i").test(t)) return false;
  if (new RegExp(gpu.exclude, "i").test(t)) return false;
  const usedOk = gpu.usedOk || source.usedSource || source.kind === "marketplace";
  if (!usedOk && USED.test(t)) return false;
  return l.price >= gpu.priceMin && l.price <= gpu.priceMax;
}

/** Candidate query forms to compare against the configured one. */
function variants(gpu: Gpu): string[] {
  const short = gpu.ticker.replace(/-/g, " ").replace(/\b(\d+)G\b/i, "");
  const core = gpu.name.replace(/^(NVIDIA|AMD|Intel|Huawei)\s+/i, "").replace(/\s+\d+\s?GB.*$/i, "");
  return [...new Set([gpu.query, core.trim(), short.trim()])];
}

async function main() {
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(ADAPTERS);
  for (const id of ids) {
    const adapter = ADAPTERS[id];
    const source = sourceById(id);
    const carried = GPUS.filter((g) => g.sources.includes(id));
    console.log(`\n########## ${id} — ${carried.length} parts`);
    for (const gpu of carried) {
      const row: string[] = [];
      for (const q of variants(gpu)) {
        try {
          const all = await adapter.fetchListings(q);
          const good = all.filter((l) => matches(gpu, l, source)).sort((a, b) => a.price - b.price);
          row.push(`"${q}" raw=${all.length} ok=${good.length}${good[0] ? ` lo=$${good[0].price}` : ""}`);
        } catch (e) {
          row.push(`"${q}" ERR ${e instanceof Error ? e.message.slice(0, 28) : e}`);
        }
        await sleep(600);
      }
      console.log(`  ${gpu.slug.padEnd(15)} ${row.join("   |   ")}`);
    }
  }
}
main();
