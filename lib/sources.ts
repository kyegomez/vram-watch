import type { Source } from "./types";

const q = (s: string) => encodeURIComponent(s);

/**
 * Source registry.
 *
 * mode "scrape" — fetched live server-side (verified to serve plain HTML).
 * mode "api"   — official API, activates when keys exist in the environment
 *                (eBay Browse API: EBAY_CLIENT_ID + EBAY_CLIENT_SECRET).
 * mode "link"  — the retailer bot-blocks server requests, so we surface a
 *                deep search link instead of a fetched price.
 *
 * Chart colors are fixed per source (categorical slots validated for the dark
 * surface) — a source keeps its color on every chart it appears on.
 */
export const SOURCES: Source[] = [
  {
    id: "ebay",
    name: "eBay",
    kind: "marketplace",
    mode: "api",
    usedSource: true,
    color: "#3987e5",
    searchUrl: (s) => `https://www.ebay.com/sch/i.html?_nkw=${q(s)}&LH_BIN=1&_sop=15`,
  },
  {
    id: "pcsp",
    name: "PC Server & Parts",
    kind: "reseller",
    mode: "scrape",
    usedSource: true,
    color: "#c98500",
    searchUrl: (s) =>
      `https://www.pcserverandparts.com/search.php?search_query=${q(s)}`,
  },
  {
    id: "bestbuy",
    name: "Best Buy",
    kind: "retailer",
    mode: "api",
    color: "#d55181",
    searchUrl: (s) => `https://www.bestbuy.com/site/searchpage.jsp?st=${q(s)}`,
  },
  {
    id: "newegg",
    name: "Newegg",
    kind: "retailer",
    mode: "scrape",
    color: "#199e70",
    searchUrl: (s) => `https://www.newegg.com/p/pl?d=${q(s)}&N=4131`,
  },
  {
    id: "central",
    name: "Central Computer",
    kind: "retailer",
    mode: "scrape",
    color: "#d95926",
    searchUrl: (s) => `https://www.centralcomputer.com/catalogsearch/result/?q=${q(s)}`,
  },
  {
    id: "wiredzone",
    name: "Wiredzone (Supermicro)",
    kind: "reseller",
    mode: "scrape",
    color: "#9085e9",
    searchUrl: (s) => `https://www.wiredzone.com/shop?search=${q(s)}`,
  },
  {
    id: "microcenter",
    name: "Micro Center",
    kind: "retailer",
    mode: "link",
    color: "#008300",
    searchUrl: (s) => `https://www.microcenter.com/search/search_results.aspx?Ntt=${q(s)}`,
  },
  {
    id: "bhphoto",
    name: "B&H Photo",
    kind: "retailer",
    mode: "link",
    color: "#e66767",
    searchUrl: (s) => `https://www.bhphotovideo.com/c/search?q=${q(s)}`,
  },
  {
    id: "amazon",
    name: "Amazon",
    kind: "marketplace",
    mode: "link",
    color: "#898781",
    searchUrl: (s) => `https://www.amazon.com/s?k=${q(s)}`,
  },
];

export const sourceById = (id: string): Source => {
  const s = SOURCES.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown source: ${id}`);
  return s;
};
