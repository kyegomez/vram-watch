import type { Listing, SourceAdapter } from "../types";
import { fetchHtml, parsePrice } from "./http";

/**
 * Central Computer (Magento) search-results scraper. Each item has a
 * `product-item-name` block with a titled `product-item-link` anchor,
 * followed by a `data-price-amount` / `finalPrice` pair in the same item.
 */
export const central: SourceAdapter = {
  id: "central",

  async fetchListings(query: string): Promise<Listing[]> {
    const url = `https://www.centralcomputer.com/catalogsearch/result/?q=${encodeURIComponent(query)}`;
    const html = await fetchHtml(url);

    const listings: Listing[] = [];
    const items = html.split(/class="product name product-item-name"/).slice(1);

    for (const item of items) {
      const anchor = item.match(
        /class="product-item-link"[^>]*href="(https:\/\/www\.centralcomputer\.com\/[^"]+)"[^>]*title="([^"]+)"/
      );
      const price = item.match(
        /data-price-amount="([\d.]+)"\s*data-price-type="finalPrice"/
      );
      if (!anchor || !price) continue;

      const value = parsePrice(price[1]);
      if (!Number.isFinite(value) || value <= 0) continue;

      listings.push({ title: anchor[2], price: value, url: anchor[1] });
    }
    return listings;
  },
};
