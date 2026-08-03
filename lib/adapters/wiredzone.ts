import type { Listing, SourceAdapter } from "../types";
import { fetchHtml, parsePrice, stripTags } from "./http";

/**
 * Wiredzone (Odoo storefront, Supermicro-authorized reseller) scraper.
 * Odoo serves attributes unquoted; each card is a `/shop/product/…` anchor
 * followed by a schema.org Offer whose current price sits in an
 * `itemprop=price` span wrapping an `oe_currency_value`.
 */
export const wiredzone: SourceAdapter = {
  id: "wiredzone",

  async fetchListings(query: string): Promise<Listing[]> {
    const url = `https://www.wiredzone.com/shop?search=${encodeURIComponent(query)}`;
    const html = await fetchHtml(url);

    const listings: Listing[] = [];
    const anchorRe =
      /<a[^>]*href="?(\/shop\/product\/[^"\s>]+)"?[^>]*>([\s\S]*?)<\/a>/g;

    let m: RegExpExecArray | null;
    while ((m = anchorRe.exec(html)) !== null) {
      const title = stripTags(m[2]);
      if (!title) continue; // image-only anchor for the same product

      // current price = text of the (hidden) itemprop=price span after this card's anchor
      const tail = html.slice(anchorRe.lastIndex, anchorRe.lastIndex + 1200);
      const price = tail.match(/itemprop="?price"?[^>]*>([\d.,]+)</);
      if (!price) continue;

      const value = parsePrice(price[1]);
      if (!Number.isFinite(value) || value <= 0) continue;

      listings.push({
        title,
        price: value,
        url: `https://www.wiredzone.com${m[1]}`,
      });
    }
    return listings;
  },
};
