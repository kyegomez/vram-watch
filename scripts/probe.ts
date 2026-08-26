/** Ad-hoc adapter probe: raw listing counts per (adapter, query). */
import { central } from "../lib/adapters/central";
import { newegg } from "../lib/adapters/newegg";
import { pcsp } from "../lib/adapters/pcsp";
import { serverpartdeals, techmikeny } from "../lib/adapters/shopify";
import { supermicro } from "../lib/adapters/supermicro";
import { wiredzone } from "../lib/adapters/wiredzone";

const ADAPTERS = {
  newegg,
  central,
  wiredzone,
  pcsp,
  techmikeny,
  serverpartdeals,
  supermicro,
} as const;

async function main() {
  const which = process.argv[2] as keyof typeof ADAPTERS | undefined;
  const query = process.argv.slice(3).join(" ") || "RTX 5090";
  const list = which ? [[which, ADAPTERS[which]] as const] : Object.entries(ADAPTERS);

  for (const [id, a] of list) {
    try {
      const r = await a.fetchListings(query);
      console.log(`\n${id}: ${r.length} listings for "${query}"`);
      for (const l of r.slice(0, 5)) {
        console.log(`   $${String(l.price).padEnd(10)} ${l.title.slice(0, 78)}`);
      }
    } catch (e) {
      console.log(`\n${id}: ERROR ${e instanceof Error ? e.message : e}`);
    }
  }
}
main();
