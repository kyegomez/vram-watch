import type { Listing, SourceAdapter } from "../types";
import { fetchHtml, parsePrice, stripTags } from "./http";

/**
 * Newegg search-results scraper. Newegg serves plain HTML server-side;
 * each result is an `item-cell` with an `item-title` anchor and a
 * `price-current` block.
 */
export const newegg: SourceAdapter = {
  id: "newegg",

  async fetchListings(query: string): Promise<Listing[]> {
    const url = `https://www.newegg.com/p/pl?d=${encodeURIComponent(query)}`;
    const html = await fetchHtml(url);

    const listings: Listing[] = [];
    const cells = html.split(/class="item-cell"/).slice(1);

    for (const cell of cells) {
      const anchor = cell.match(
        /<a href="(https:\/\/www\.newegg\.com\/[^"]+)"[^>]*class="item-title"[^>]*>([\s\S]*?)<\/a>/
      );
      const price = cell.match(
        /price-current"[^$]*\$<strong>([\d,]+)<\/strong><sup>\.?(\d*)/
      );
      if (!anchor || !price) continue;

      const value = parsePrice(`${price[1]}.${price[2] || "00"}`);
      if (!Number.isFinite(value) || value <= 0) continue;

      // In-stock cells offer "Add to cart"; unbuyable ones swap in an
      // out-of-stock or notify button. Only assert false when it's explicit.
      const button = cell.match(/item-button-area[\s\S]{0,240}/)?.[0] ?? "";
      const unbuyable = /out of stock|sold out|auto notify|coming soon|pre-?order/i.test(
        button
      );

      listings.push({
        title: stripTags(anchor[2]),
        price: value,
        url: anchor[1],
        ...(unbuyable ? { inStock: false } : {}),
      });
    }
    return listings;
  },
};
