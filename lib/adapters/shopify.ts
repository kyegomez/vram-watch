import type { Listing, SourceAdapter } from "../types";
import { fetchHtml } from "./http";

/**
 * Generic Shopify adapter.
 *
 * Every Shopify storefront exposes `/search/suggest.json`, which returns
 * structured product JSON — title, price, availability, handle — instead of
 * markup that changes whenever the theme is touched. That makes it far more
 * durable than scraping the rendered search page, so any Shopify-based
 * reseller can be added with one line in the registry.
 *
 * Caveat: suggest search is fuzzy and ORs terms, so "RTX 4090" happily
 * returns a Quadro 410. That's fine — the filter gate in `refresh.ts` is what
 * decides whether a listing is actually the part.
 */

interface SuggestProduct {
  title: string;
  url: string;
  price: string | number;
  available?: boolean;
}

const LIMIT = 10; // suggest.json caps here

export function shopify(id: string, host: string): SourceAdapter {
  return {
    id,

    async fetchListings(query: string): Promise<Listing[]> {
      const params = new URLSearchParams({
        q: query,
        "resources[type]": "product",
        "resources[limit]": String(LIMIT),
      });
      const body = await fetchHtml(`https://${host}/search/suggest.json?${params}`);

      let products: SuggestProduct[];
      try {
        products = JSON.parse(body)?.resources?.results?.products ?? [];
      } catch {
        throw new Error(`${id}: search/suggest.json did not return JSON`);
      }

      return products
        .map((p) => ({
          title: p.title,
          // Shopify reports dollars here (not cents) for suggest results.
          price: typeof p.price === "number" ? p.price : Number.parseFloat(p.price),
          url: p.url.startsWith("http") ? p.url : `https://${host}${p.url}`,
          inStock: p.available,
        }))
        .filter((l) => Number.isFinite(l.price) && l.price > 0);
    },
  };
}

/** Refurb server & GPU specialist — strong used signal for Tesla-class cards. */
export const techmikeny = shopify("techmikeny", "www.techmikeny.com");

/** Enterprise parts reseller — new and refurb datacenter/workstation GPUs. */
export const serverpartdeals = shopify("serverpartdeals", "serverpartdeals.com");
