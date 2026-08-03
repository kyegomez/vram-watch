/**
 * Standalone refresh for cron — appends today's snapshot to data/.
 *
 *   pnpm refresh
 *
 * e.g. crontab: 0 8,20 * * *  cd <repo> && pnpm refresh
 */
import { refreshAll } from "../lib/refresh";

async function main() {
  const result = await refreshAll();
  console.log(
    `[vramwatch] ${result.at} — ${result.prices} prices recorded, ${Object.keys(result.errors).length} errors`
  );
  for (const [key, message] of Object.entries(result.errors)) {
    console.error(`  ${key}: ${message}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
