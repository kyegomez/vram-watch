import type { Listing, SourceAdapter } from "../types";
import { fetchHtml, parsePrice, stripTags } from "./http";

/**
 * Supermicro's own e-store (Magento).
 *
 * Unlike every other source here, Supermicro sells no bare GPU cards — its
 * catalog is whole GPU systems and server accessories. So this adapter is what
 * backs the "GPU systems" category: complete 4U/5U/8U boxes with the
 * accelerators already in them, priced publicly, which almost nobody else in
 * the channel does.
 *
 * There is no usable search endpoint (catalogsearch renders results
 * client-side), so it walks the GPU category instead and returns the whole
 * catalog on every call — the filter gate in `refresh.ts` picks out the SKU
 * each tracked system wants. One sweep therefore needs one fetch, not one per
 * system, which is what the short-lived cache below is for.
 */

const CATEGORY = "https://store.supermicro.com/us_en/systems/gpu.html";
const MAX_PAGES = 6;
const CACHE_MS = 5 * 60_000;

let cache: { at: number; listings: Listing[] } | null = null;

/** Each card is a product-item-link anchor followed by its price span. */
function parsePage(html: string): Listing[] {
  const out: Listing[] = [];
  const blocks = html.split(/class="product-item-link"/).slice(1);

  for (const block of blocks) {
    const href = block.match(/^[^>]*href="(https:\/\/store\.supermicro\.com\/[^"]+)"/);
    const name = block.match(/>([\s\S]{0,200}?)<\/a>/);
    const price = block.match(/<span class="price"[^>]*>\$([\d,]+\.?\d*)<\/span>/);
    if (!href || !name || !price) continue;

    const value = parsePrice(price[1]);
    const title = stripTags(name[1]);
    if (!title || !Number.isFinite(value) || value <= 0) continue;

    out.push({ title, price: value, url: href[1] });
  }
  return out;
}

async function loadCatalog(): Promise<Listing[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.listings;

  const byUrl = new Map<string, Listing>();
  for (let page = 1; page <= MAX_PAGES; page++) {
    const html = await fetchHtml(page === 1 ? CATEGORY : `${CATEGORY}?p=${page}`);
    const listings = parsePage(html);
    // Past the last page Magento re-serves earlier products — stop on no news.
    const fresh = listings.filter((l) => !byUrl.has(l.url));
    if (fresh.length === 0) break;
    for (const l of fresh) byUrl.set(l.url, l);
  }

  const listings = [...byUrl.values()];
  cache = { at: Date.now(), listings };
  return listings;
}

export const supermicro: SourceAdapter = {
  id: "supermicro",
  /** `query` is ignored — the whole GPU category is returned and then filtered. */
  fetchListings: loadCatalog,
};
