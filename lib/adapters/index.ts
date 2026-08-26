import type { SourceAdapter } from "../types";
import { bestbuy, bestbuyEnabled } from "./bestbuy";
import { central } from "./central";
import { ebay, ebayEnabled } from "./ebay";
import { newegg } from "./newegg";
import { pcsp } from "./pcsp";
import { serverpartdeals, techmikeny } from "./shopify";
import { supermicro } from "./supermicro";
import { wiredzone } from "./wiredzone";

/** Adapters that can actually fetch right now (API ones only with keys set). */
export function activeAdapters(): SourceAdapter[] {
  const list: SourceAdapter[] = [
    newegg,
    central,
    wiredzone,
    pcsp,
    techmikeny,
    serverpartdeals,
    supermicro,
  ];
  if (ebayEnabled()) list.push(ebay);
  if (bestbuyEnabled()) list.push(bestbuy);
  return list;
}
