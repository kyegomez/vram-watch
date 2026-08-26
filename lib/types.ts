/** "system" is a whole GPU server, not a card — priced by the box. */
export type Category = "consumer" | "workstation" | "datacenter" | "system";

export interface Gpu {
  slug: string;
  ticker: string;
  name: string;
  vendor: "NVIDIA" | "AMD" | "Intel" | "Huawei" | "Supermicro";
  category: Category;
  vram: string;
  arch: string;
  msrp: number | null;
  /** Search query sent to every source. */
  query: string;
  /**
   * Per-source query overrides. Some search engines OR the terms (BigCommerce,
   * Shopify) or narrow to nothing on a long string (Odoo), so the query that
   * works at Newegg can return junk or zero rows elsewhere. Keyed by source id.
   */
  queries?: Record<string, string>;
  /**
   * The bare model token — "RTX 5090", "H100", "MI300X". Sources whose search
   * ORs terms or narrows on long strings get this instead of `query`.
   */
  modelQuery?: string;
  /** Case-insensitive regex a listing title must match. */
  match: string;
  /** Case-insensitive regex that disqualifies a listing (wrong model, parts, bundles). */
  exclude: string;
  /** Sanity band — listings priced outside are ignored (blocks cables, waterblocks, scalps). */
  priceMin: number;
  priceMax: number;
  /** EOL parts trade used/refurb even at retailers — allow those conditions. */
  usedOk?: boolean;
  /** Source ids that carry this part, in display order. */
  sources: string[];
  blurb: string;
}

export interface Source {
  id: string;
  name: string;
  kind: "marketplace" | "retailer" | "reseller" | "oem";
  /** "scrape" fetches live prices; "api" needs env keys; "link" is buy-link only. */
  mode: "scrape" | "api" | "link";
  /** Source deals in used/refurb by nature — condition filtering doesn't apply. */
  usedSource?: boolean;
  /**
   * What shape of query this source's search wants. Measured, not assumed:
   * "full" (default) sends the product name — right for Newegg and Magento.
   * "model" sends the bare model token — Odoo narrows to nothing on a long
   * string, and Shopify's suggest endpoint ORs the extra words into noise.
   * "vendorModel" prefixes the vendor — BigCommerce returns zero rows for a
   * bare token but matches well on "NVIDIA Tesla V100".
   */
  searchStyle?: "full" | "model" | "vendorModel";
  /** Fixed categorical chart color — follows the source everywhere. */
  color: string;
  /** Storefront root, for the sources page. */
  homepage: string;
  /** How prices are obtained here, in one line — including why, if link-only. */
  note: string;
  searchUrl: (query: string) => string;
}

/** One live listing pulled from a source. */
export interface Listing {
  title: string;
  price: number;
  url: string;
  /**
   * Only set when the source states it. `false` listings are dropped — an
   * out-of-stock page price is not a price you can pay. `undefined` means the
   * source didn't say, and the listing is kept.
   */
  inStock?: boolean;
}

/** A source adapter returns raw listings for a query — the seam all data flows through. */
export interface SourceAdapter {
  id: string;
  fetchListings(query: string): Promise<Listing[]>;
}

/**
 * One day's observations for a (gpu, source). Sweeps accumulate into this
 * rather than overwriting, so `lo` is the day's true low across every sweep.
 */
export interface DayStat {
  /** Lowest matching price seen that day (USD) — what the charts plot. */
  lo: number;
  /** Highest matching price seen that day, for the intraday range. */
  hi: number;
  /** How many sweeps contributed an observation. */
  n: number;
  /** ISO timestamp of the most recent observation. */
  at: string;
}

/**
 * history.json: gpu slug → source id → ISO day → the day's stats.
 *
 * Older files stored a bare number per day; `readHistory` normalizes those
 * into `DayStat` on read, so both shapes load.
 */
export type History = Record<string, Record<string, Record<string, DayStat>>>;

/** What may actually sit in history.json on disk. */
export type StoredDay = number | DayStat;

/** listings.json: gpu slug → source id → cheapest matching listings from the last refresh. */
export type ListingBook = Record<string, Record<string, Listing[]>>;

export interface StoreMeta {
  lastRefresh: string | null; // ISO datetime
  errors: Record<string, string>;
}

export interface PricePoint {
  date: string;
  price: number;
}

export interface SourceSeries {
  sourceId: string;
  points: PricePoint[];
  current: number | null;
}

export interface GpuQuote {
  slug: string;
  /** Latest lowest price across sources, null until first refresh lands data. */
  best: number | null;
  bestSourceId: string | null;
  /** Highest price observed today across sources — the spread above `best`. */
  spreadHigh: number | null;
  /** How many price observations back today's quote, across all sources. */
  observations: number;
  delta24h: number | null;
  delta7d: number | null;
  delta30d: number | null;
  /** Cross-source best price per day (up to 30 days) for sparklines. */
  spark: PricePoint[];
  series: SourceSeries[];
}
