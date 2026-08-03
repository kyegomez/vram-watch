export type Category = "consumer" | "workstation" | "datacenter";

export interface Gpu {
  slug: string;
  ticker: string;
  name: string;
  vendor: "NVIDIA" | "AMD" | "Intel" | "Huawei";
  category: Category;
  vram: string;
  arch: string;
  msrp: number | null;
  /** Search query sent to every source. */
  query: string;
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
  kind: "marketplace" | "retailer" | "reseller";
  /** "scrape" fetches live prices; "api" needs env keys; "link" is buy-link only. */
  mode: "scrape" | "api" | "link";
  /** Source deals in used/refurb by nature — condition filtering doesn't apply. */
  usedSource?: boolean;
  /** Fixed categorical chart color — follows the source everywhere. */
  color: string;
  searchUrl: (query: string) => string;
}

/** One live listing pulled from a source. */
export interface Listing {
  title: string;
  price: number;
  url: string;
}

/** A source adapter returns raw listings for a query — the seam all data flows through. */
export interface SourceAdapter {
  id: string;
  fetchListings(query: string): Promise<Listing[]>;
}

/** history.json: gpu slug → source id → ISO day → representative price (USD). */
export type History = Record<string, Record<string, Record<string, number>>>;

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
  delta24h: number | null;
  delta7d: number | null;
  delta30d: number | null;
  /** Cross-source best price per day (up to 30 days) for sparklines. */
  spark: PricePoint[];
  series: SourceSeries[];
}
