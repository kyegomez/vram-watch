import type { Listing, SourceAdapter } from "../types";

/**
 * eBay via the official Browse API (eBay blocks plain server scraping).
 *
 * Free to set up: create an app at https://developer.ebay.com, then put
 *   EBAY_CLIENT_ID=...
 *   EBAY_CLIENT_SECRET=...
 * in `.env.local`. Without keys this adapter reports itself disabled and the
 * app simply shows eBay as a link-only source.
 */

let cachedToken: { value: string; expires: number } | null = null;

export const ebayEnabled = (): boolean =>
  Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET);

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires - 60_000) {
    return cachedToken.value;
  }
  const auth = Buffer.from(
    `${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`,
    },
    body: "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`eBay OAuth failed: HTTP ${res.status}`);

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    expires: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

export const ebay: SourceAdapter = {
  id: "ebay",

  async fetchListings(query: string): Promise<Listing[]> {
    if (!ebayEnabled()) return [];
    const token = await getToken();

    const params = new URLSearchParams({
      q: query,
      limit: "50",
      filter: "buyingOptions:{FIXED_PRICE},itemLocationCountry:US,conditions:{NEW|USED}",
      sort: "price",
    });
    const res = await fetch(
      `https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
        },
        signal: AbortSignal.timeout(20000),
      }
    );
    if (!res.ok) throw new Error(`eBay Browse API: HTTP ${res.status}`);

    const data = (await res.json()) as {
      itemSummaries?: {
        title: string;
        price?: { value: string; currency: string };
        itemWebUrl: string;
      }[];
    };

    return (data.itemSummaries ?? [])
      .filter((i) => i.price?.currency === "USD")
      .map((i) => ({
        title: i.title,
        price: Number.parseFloat(i.price!.value),
        url: i.itemWebUrl,
      }))
      .filter((l) => Number.isFinite(l.price) && l.price > 0);
  },
};
