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
 * surface) — a source keeps its color on every chart it appears on. The
 * chartable set is CVD-optimized; re-run `pnpm exec tsx scripts/check-palette.ts`
 * after changing a color or adding a chartable source (min ΔE must stay >= 20).
 */
export const SOURCES: Source[] = [
  {
    id: "ebay",
    name: "eBay",
    kind: "marketplace",
    mode: "api",
    usedSource: true,
    color: "#0cffff",
    homepage: "https://www.ebay.com",
    note:
      "Official Browse API. The deepest pool of used and gray-market silicon — often the only place loose SXM modules and EOL datacenter cards trade at all. Needs free API keys.",
    searchUrl: (s) => `https://www.ebay.com/sch/i.html?_nkw=${q(s)}&LH_BIN=1&_sop=15`,
  },
  {
    id: "pcsp",
    name: "PC Server & Parts",
    kind: "reseller",
    mode: "scrape",
    usedSource: true,
    searchStyle: "vendorModel",
    color: "#cf8601",
    homepage: "https://www.pcserverandparts.com",
    note:
      "Refurbished datacenter and workstation specialist. Search ORs its terms, so queries are tuned per part; stock skews toward previous-generation Tesla cards.",
    searchUrl: (s) =>
      `https://www.pcserverandparts.com/search.php?search_query=${q(s)}`,
  },
  {
    id: "bestbuy",
    name: "Best Buy",
    kind: "retailer",
    mode: "api",
    color: "#ffc702",
    homepage: "https://www.bestbuy.com",
    note:
      "Official Products API — the storefront blocks servers, the API does not. Consumer cards only. Needs a free API key.",
    searchUrl: (s) => `https://www.bestbuy.com/site/searchpage.jsp?st=${q(s)}`,
  },
  {
    id: "newegg",
    name: "Newegg",
    kind: "retailer",
    mode: "scrape",
    color: "#48bc83",
    homepage: "https://www.newegg.com",
    note:
      "Serves plain HTML server-side. The broadest single source here: consumer, workstation and even H100/H200 PCIe cards, with reliable stock signals.",
    searchUrl: (s) => `https://www.newegg.com/p/pl?d=${q(s)}&N=4131`,
  },
  {
    id: "central",
    name: "Central Computer",
    kind: "retailer",
    mode: "scrape",
    color: "#ff4054",
    homepage: "https://www.centralcomputer.com",
    note:
      "Bay Area retailer on Magento. Consistently among the sharpest prices on current-generation consumer cards.",
    searchUrl: (s) => `https://www.centralcomputer.com/catalogsearch/result/?q=${q(s)}`,
  },
  {
    id: "wiredzone",
    name: "Wiredzone (Supermicro)",
    kind: "reseller",
    mode: "scrape",
    searchStyle: "model",
    color: "#aa57bc",
    homepage: "https://www.wiredzone.com",
    note:
      "Supermicro-authorized reseller on Odoo. One of the few places that lists real prices for H100 PCIe/NVL and A100 rather than quote-on-request.",
    searchUrl: (s) => `https://www.wiredzone.com/shop?search=${q(s)}`,
  },
  {
    id: "techmikeny",
    name: "TechMikeNY",
    kind: "reseller",
    mode: "scrape",
    usedSource: true,
    searchStyle: "model",
    color: "#4251f5",
    homepage: "https://www.techmikeny.com",
    note:
      "Refurbished enterprise hardware, read through Shopify's structured product JSON. Strong secondary-market signal for Tesla V100 and workstation Quadro cards.",
    searchUrl: (s) => `https://www.techmikeny.com/search?q=${q(s)}`,
  },
  {
    id: "serverpartdeals",
    name: "Server Part Deals",
    kind: "reseller",
    mode: "scrape",
    usedSource: true,
    searchStyle: "model",
    color: "#b9fcd0",
    homepage: "https://serverpartdeals.com",
    note:
      "Enterprise parts reseller, also read through Shopify's product JSON. Carries new and refurbished datacenter GPUs, frequently below the reseller average.",
    searchUrl: (s) => `https://serverpartdeals.com/search?q=${q(s)}`,
  },
  {
    id: "supermicro",
    name: "Supermicro Store",
    kind: "oem",
    mode: "scrape",
    color: "#f2f296",
    homepage: "https://store.supermicro.com",
    note:
      "Supermicro's own e-store — the manufacturer selling direct. It lists no bare GPU cards, but it publishes real prices for complete GPU systems (8-way HGX H200/B300 and MI300X boxes), which almost nobody else in the channel does in public.",
    searchUrl: () => "https://store.supermicro.com/us_en/systems/gpu.html",
  },
  {
    id: "microcenter",
    name: "Micro Center",
    kind: "retailer",
    mode: "link",
    color: "#007629",
    homepage: "https://www.microcenter.com",
    note:
      "In-store pricing is regularly the best in the country on consumer cards, but every request from a server — including robots.txt — is refused at the edge, so we link you straight to their search instead of quoting a price we can't fetch honestly.",
    searchUrl: (s) => `https://www.microcenter.com/search/search_results.aspx?Ntt=${q(s)}`,
  },
  {
    id: "bhphoto",
    name: "B&H Photo",
    kind: "retailer",
    mode: "link",
    color: "#b1366b",
    homepage: "https://www.bhphotovideo.com",
    note:
      "Blocks automated requests, so it gets a deep search link rather than a fetched price.",
    searchUrl: (s) => `https://www.bhphotovideo.com/c/search?q=${q(s)}`,
  },
  {
    id: "amazon",
    name: "Amazon",
    kind: "marketplace",
    mode: "link",
    color: "#86a1b4",
    homepage: "https://www.amazon.com",
    note:
      "Blocks automated requests. Marketplace pricing swings hard on third-party sellers, so we link out rather than quote.",
    searchUrl: (s) => `https://www.amazon.com/s?k=${q(s)}`,
  },
];

export const sourceById = (id: string): Source => {
  const s = SOURCES.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown source: ${id}`);
  return s;
};
