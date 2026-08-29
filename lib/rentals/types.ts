/**
 * Rental market types.
 *
 * The buy side of this app tracks a *part* you purchase once. This side tracks
 * the same silicon rented by the hour, which is a different shape of market:
 * a provider doesn't sell "an H100", it sells a node with 1/2/4/8 of them
 * attached, in a region, that is either available right now or not.
 *
 * Everything is normalized to two numbers so the two markets can be compared:
 *   `perGpuHour`  — node price / GPU count. The rate that compares across
 *                   providers and against a card's purchase price.
 *   `nodeHour`    — what the whole box actually costs per hour. The number you
 *                   are billed, and the only honest way to price a cluster.
 */

/** How the provider sells capacity — it changes how much a quote can be trusted. */
export type ProviderKind =
  /** AWS/Azure — list price, effectively unlimited capacity, most expensive. */
  | "hyperscaler"
  /** Purpose-built GPU cloud (Lambda, Crusoe, Nebius, Voltage Park…). */
  | "neocloud"
  /** Per-GPU container/pod platforms (RunPod). */
  | "platform"
  /** Peer-to-peer compute markets where hosts set their own price (Vast.ai). */
  | "marketplace";

export interface RentalProvider {
  id: string;
  name: string;
  kind: ProviderKind;
  /**
   * Which adapter supplies this provider's prices. Most neoclouds are read
   * through Shadeform's public catalog rather than one-off scrapers.
   */
  via: "shadeform" | "runpod" | "vastai" | "azure" | "aws";
  homepage: string;
  /** Where a visitor goes to actually rent — provider pricing/console page. */
  rentUrl: string;
  /** One line on what this provider is and how its prices are obtained. */
  note: string;
}

/**
 * A rentable GPU model. Deliberately narrower than the raw provider
 * vocabularies: `H100 SXM` and `H100 PCIe` are separate markets that rent at
 * genuinely different rates, so they stay separate rows.
 */
/**
 * How the rental market segments. Not a spec class — a shopping intent:
 * who you are competing with for the capacity, and what it's rented for.
 */
export type RentTier = "frontier" | "datacenter" | "workstation";

export interface RentModel {
  slug: string;
  ticker: string;
  name: string;
  vendor: "NVIDIA" | "AMD" | "Intel";
  vram: string;
  arch: string;
  tier: RentTier;
  /** Matching part on the buy side, when one is tracked — powers rent-vs-buy. */
  buySlug?: string;
  /**
   * Sanity band on $/GPU/hour. A quote outside it is a unit-conversion bug or
   * a fractional-GPU slice, not a real rate for this part.
   */
  rateMin: number;
  rateMax: number;
  blurb: string;
}

/** One live rentable configuration at one provider. */
export interface RentalOffer {
  providerId: string;
  modelSlug: string;
  /** GPUs attached to the node — 1 for a single card, 8 for a full HGX box. */
  gpuCount: number;
  /** Node price per hour, USD — what you are actually billed. */
  nodeHour: number;
  /** nodeHour / gpuCount — the cross-provider comparable rate. */
  perGpuHour: number;
  /** Provider's own name for the shape, e.g. "p5.48xlarge" or "H100_sxm5x8". */
  instance: string;
  /** Interconnect between GPUs, when the provider states it ("sxm5", "pcie"). */
  interconnect?: string;
  /** Region the quote is for, when the provider is region-priced. */
  region?: string;
  /**
   * Live availability, when the provider publishes it. `false` offers are kept
   * (the price is real and worth charting) but never presented as bookable.
   */
  available?: boolean;
  /** Deep link to rent this exact configuration, when one exists. */
  url?: string;
  /** Interruptible/spot capacity — priced lower, can be reclaimed. */
  spot?: boolean;
}

/** rentals-offers.json: model slug → provider id → that provider's live offers. */
export type OfferBook = Record<string, Record<string, RentalOffer[]>>;

/** rentals-history.json: model slug → provider id → ISO day → the day's stats. */
export type RentalHistory = Record<
  string,
  Record<string, Record<string, import("../types").DayStat>>
>;

export interface RentalSourceAdapter {
  id: RentalProvider["via"];
  /** One call per sweep returns the adapter's entire catalog — not per-model queries. */
  fetchOffers(): Promise<RentalOffer[]>;
}

export interface ProviderRate {
  providerId: string;
  /**
   * The rate we quote for this provider: its cheapest *bookable* offer, or its
   * cheapest offer overall when it has no capacity anywhere.
   */
  perGpuHour: number;
  /** Cheapest bookable per-GPU-hour, null when nothing here has capacity. */
  bookable: number | null;
  /** The offer `perGpuHour` came from. */
  offer: RentalOffer;
  /** Every shape this provider rents the model in, cheapest per-GPU first. */
  offers: RentalOffer[];
  points: import("../types").PricePoint[];
}

export interface RentalQuote {
  slug: string;
  /**
   * The headline rate: cheapest per-GPU-hour you can actually book right now.
   * Null before the first sweep. When no provider has capacity this falls back
   * to the cheapest quoted rate and `bestAvailable` goes false — the same rule
   * the retail board applies to out-of-stock listings, which are never allowed
   * to set the headline price.
   */
  best: number | null;
  bestProviderId: string | null;
  /** False when `best` came from an offer no provider currently has capacity for. */
  bestAvailable: boolean;
  /** Highest per-GPU-hour quoted today — the spread the low is worth chasing. */
  spreadHigh: number | null;
  /** Cheapest 8-GPU node per hour, for cluster shoppers. */
  bestCluster: RentalOffer | null;
  /** How many providers quote the model right now. */
  providerCount: number;
  /** Offers marked available by their provider right now. */
  availableCount: number;
  delta24h: number | null;
  delta7d: number | null;
  delta30d: number | null;
  spark: import("../types").PricePoint[];
  rates: ProviderRate[];
}
