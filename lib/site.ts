/**
 * Single source of truth for everything SEO needs an absolute answer to:
 * the canonical origin, the brand, and the boilerplate copy that titles,
 * descriptions, structured data and OG images all derive from.
 */

const RAW_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://vram.swarms.world");

/** Canonical origin, never with a trailing slash. */
export const SITE_URL = RAW_SITE_URL.replace(/\/+$/, "");

export const SITE_NAME = "VRAMWATCH";
export const SITE_TAGLINE = "Live GPU Price Tracker & Aggregator";
export const SITE_TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`;

export const SITE_DESCRIPTION =
  "Track live street prices for gaming and AI GPUs — RTX 5090, RTX 4090, RX 9070 XT, H100, H200, B200, MI300X and more — aggregated across Newegg, eBay, Best Buy, Micro Center, Amazon, B&H and Supermicro resellers. Real price history, 24h/7d/30d moves and direct buy links.";

/** Short form for OG/Twitter cards, which truncate hard. */
export const SITE_DESCRIPTION_SHORT =
  "Live street prices for gaming and AI GPUs, aggregated across retailers, resellers and the used market — with real price history and direct buy links.";

export const BRAND_COLOR = "#3ecf8e";
export const BRAND_BG = "#0c1113";

export const TWITTER_HANDLE = "@swarms_corp";

export const SITE_KEYWORDS = [
  "GPU prices",
  "GPU price tracker",
  "GPU price comparison",
  "graphics card prices",
  "RTX 5090 price",
  "RTX 5080 price",
  "RTX 4090 price",
  "RX 9070 XT price",
  "H100 price",
  "H200 price",
  "B200 price",
  "A100 price",
  "MI300X price",
  "AI GPU prices",
  "datacenter GPU prices",
  "GPU price history",
  "cheapest GPU",
  "GPU deals",
  "used GPU prices",
  "GPU market",
];

/** Resolve a path against the canonical origin. */
export const absoluteUrl = (path = "/"): string =>
  new URL(path, `${SITE_URL}/`).toString();
