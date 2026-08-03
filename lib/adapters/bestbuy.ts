import type { Listing, SourceAdapter } from "../types";

/**
 * Best Buy via the official Products API (the storefront bot-blocks servers).
 * Free key from https://developer.bestbuy.com — put BESTBUY_API_KEY in
 * `.env.local`. Without it the adapter reports disabled and Best Buy stays a
 * link-only source.
 */

export const bestbuyEnabled = (): boolean =>
  Boolean(process.env.BESTBUY_API_KEY);

export const bestbuy: SourceAdapter = {
  id: "bestbuy",

  async fetchListings(query: string): Promise<Listing[]> {
    if (!bestbuyEnabled()) return [];

    // words become ANDed search clauses: (search=rtx&search=5090)
    const clauses = query
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => `search=${encodeURIComponent(w)}`)
      .join("&");

    const url =
      `https://api.bestbuy.com/v1/products(${clauses})` +
      `?apiKey=${process.env.BESTBUY_API_KEY}` +
      `&format=json&pageSize=50&show=name,salePrice,url,onlineAvailability`;

    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`Best Buy API: HTTP ${res.status}`);

    const data = (await res.json()) as {
      products?: {
        name: string;
        salePrice: number;
        url: string;
        onlineAvailability: boolean;
      }[];
    };

    return (data.products ?? [])
      .filter((p) => p.onlineAvailability && p.salePrice > 0)
      .map((p) => ({ title: p.name, price: p.salePrice, url: p.url }));
  },
};
