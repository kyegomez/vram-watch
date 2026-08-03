import type { Listing, SourceAdapter } from "../types";
import { fetchHtml, parsePrice } from "./http";

const decodeEntities = (s: string): string =>
  s
    .replace(/&#x3D;/gi, "=")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");

/**
 * PC Server & Parts (BigCommerce) — refurb datacenter/workstation specialist,
 * a strong secondary-market signal for V100/A100-class cards. Each result
 * card's title anchor carries "TITLE, $PRICE" in its aria-label.
 */
export const pcsp: SourceAdapter = {
  id: "pcsp",

  async fetchListings(query: string): Promise<Listing[]> {
    const url = `https://www.pcserverandparts.com/search.php?search_query=${encodeURIComponent(query)}`;
    const html = await fetchHtml(url);

    const listings: Listing[] = [];
    const cardRe =
      /class="card-title[^"]*"\s*>\s*<a aria-label="([\s\S]*?)"\s*href="([^"]+)"/g;

    let m: RegExpExecArray | null;
    while ((m = cardRe.exec(html)) !== null) {
      const label = m[1].replace(/\s+/g, " ").trim();
      const parts = label.match(/^(.*),\s*\$([\d,.]+)$/);
      if (!parts) continue;

      const value = parsePrice(parts[2]);
      if (!Number.isFinite(value) || value <= 0) continue;

      listings.push({
        title: parts[1].trim(),
        price: value,
        url: decodeEntities(m[2]),
      });
    }
    return listings;
  },
};
