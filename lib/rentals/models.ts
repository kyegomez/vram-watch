import type { RentModel, RentTier } from "./types";

/**
 * Rentable GPU models.
 *
 * Split by the lines the rental market actually prices on, not by marketing
 * name: H100 SXM, H100 PCIe and H100 NVL are three different rates and stay
 * three rows. `buySlug` ties a model back to the part on the buy side, which
 * is what makes rent-vs-buy breakeven possible.
 *
 * `rateMin`/`rateMax` are a sanity band on $/GPU/hour. Their job is to catch a
 * unit error (cents read as dollars), a fractional-GPU slice quoted as a whole
 * card, or a node whose GPU count we mapped wrong — not to express an opinion
 * about what the market should charge.
 */
export const RENT_MODELS: RentModel[] = [
  {
    slug: "b300",
    ticker: "B300",
    name: "NVIDIA B300",
    vendor: "NVIDIA",
    vram: "288 GB HBM3e",
    arch: "Blackwell Ultra",
    tier: "frontier",
    rateMin: 1.5,
    rateMax: 45,
    blurb:
      "Blackwell Ultra, the newest silicon anyone rents by the hour. Barely available outside a handful of clouds, and priced accordingly.",
  },
  {
    slug: "b200",
    ticker: "B200",
    name: "NVIDIA B200",
    vendor: "NVIDIA",
    vram: "180 GB HBM3e",
    arch: "Blackwell",
    tier: "frontier",
    buySlug: "b200",
    rateMin: 1.5,
    rateMax: 40,
    blurb:
      "The current frontier training part. Rental supply has widened fast, and the spread between the cheapest neocloud and the hyperscalers is the largest on the board.",
  },
  {
    slug: "h200",
    ticker: "H200",
    name: "NVIDIA H200 SXM",
    vendor: "NVIDIA",
    vram: "141 GB HBM3e",
    arch: "Hopper",
    tier: "frontier",
    buySlug: "h200",
    rateMin: 1.0,
    rateMax: 25,
    blurb:
      "H100's memory-upgraded sibling — same compute, 141 GB at 4.8 TB/s. The default choice for serving large models, and usually only slightly dearer than an H100.",
  },
  {
    slug: "h200-nvl",
    ticker: "H200-NVL",
    name: "NVIDIA H200 NVL",
    vendor: "NVIDIA",
    vram: "141 GB HBM3e",
    arch: "Hopper",
    tier: "frontier",
    buySlug: "h200-nvl",
    rateMin: 1.0,
    rateMax: 25,
    blurb:
      "The PCIe/NVLink-bridged H200 for standard servers. Thinner rental supply than the SXM part.",
  },
  {
    slug: "h100-sxm",
    ticker: "H100-SXM",
    name: "NVIDIA H100 SXM",
    vendor: "NVIDIA",
    vram: "80 GB HBM3",
    arch: "Hopper",
    tier: "frontier",
    buySlug: "h100-sxm",
    rateMin: 0.8,
    rateMax: 20,
    blurb:
      "The benchmark rental of the AI market. Eight of them NVLinked in a box is the unit almost every training cluster is sold in, and its hourly rate is the closest thing this industry has to a spot price.",
  },
  {
    slug: "h100-pcie",
    ticker: "H100-PCIE",
    name: "NVIDIA H100 PCIe",
    vendor: "NVIDIA",
    vram: "80 GB HBM2e",
    arch: "Hopper",
    tier: "frontier",
    buySlug: "h100-pcie",
    rateMin: 0.7,
    rateMax: 18,
    blurb:
      "The card-form H100. Slower memory and no NVLink fabric, so it rents at a discount to SXM and suits single-GPU inference rather than distributed training.",
  },
  {
    slug: "h100-nvl",
    ticker: "H100-NVL",
    name: "NVIDIA H100 NVL",
    vendor: "NVIDIA",
    vram: "94 GB HBM3",
    arch: "Hopper",
    tier: "frontier",
    buySlug: "h100-nvl",
    rateMin: 0.7,
    rateMax: 18,
    blurb:
      "Two PCIe H100s bridged into a 94 GB pair, built for large-model inference in conventional servers.",
  },
  {
    slug: "gh200",
    ticker: "GH200",
    name: "NVIDIA GH200 Grace Hopper",
    vendor: "NVIDIA",
    vram: "96 GB HBM3",
    arch: "Grace Hopper",
    tier: "frontier",
    rateMin: 0.8,
    rateMax: 15,
    blurb:
      "Grace CPU fused to a Hopper GPU over NVLink-C2C. Rare in the rental market, and interesting mainly for memory-bound workloads.",
  },
  {
    slug: "mi300x",
    ticker: "MI300X",
    name: "AMD Instinct MI300X",
    vendor: "AMD",
    vram: "192 GB HBM3",
    arch: "CDNA 3",
    tier: "frontier",
    buySlug: "mi300x",
    rateMin: 0.8,
    rateMax: 15,
    blurb:
      "AMD's answer to the H100, with more memory per GPU than anything NVIDIA shipped in the same generation. The main non-CUDA option you can rent by the hour.",
  },
  {
    slug: "a100-80gb",
    ticker: "A100-80",
    name: "NVIDIA A100 80GB",
    vendor: "NVIDIA",
    vram: "80 GB HBM2e",
    arch: "Ampere",
    tier: "datacenter",
    buySlug: "a100-80gb",
    rateMin: 0.4,
    rateMax: 12,
    blurb:
      "The previous generation's workhorse, now the value tier of the rental market. Still the cheapest way to get 80 GB of HBM by the hour.",
  },
  {
    slug: "a100-40gb",
    ticker: "A100-40",
    name: "NVIDIA A100 40GB",
    vendor: "NVIDIA",
    vram: "40 GB HBM2",
    arch: "Ampere",
    tier: "datacenter",
    buySlug: "a100-40gb",
    rateMin: 0.3,
    rateMax: 10,
    blurb:
      "The original A100. Deep supply at the hyperscalers and steadily falling rates as Hopper capacity comes online.",
  },
  {
    slug: "rtx-pro-6000",
    ticker: "PRO-6000",
    name: "NVIDIA RTX PRO 6000 Blackwell",
    vendor: "NVIDIA",
    vram: "96 GB GDDR7",
    arch: "Blackwell",
    tier: "workstation",
    buySlug: "rtx-pro-6000",
    rateMin: 0.3,
    rateMax: 8,
    blurb:
      "96 GB of GDDR7 without datacenter pricing. Rapidly becoming the sweet spot for single-GPU inference of mid-size models.",
  },
  {
    slug: "l40s",
    ticker: "L40S",
    name: "NVIDIA L40S",
    vendor: "NVIDIA",
    vram: "48 GB GDDR6",
    arch: "Ada Lovelace",
    tier: "datacenter",
    buySlug: "l40s",
    rateMin: 0.15,
    rateMax: 10,
    blurb:
      "The universal inference and rendering card. Widely stocked at every tier of the market, which keeps its rental rate honest.",
  },
  {
    slug: "l40",
    ticker: "L40",
    name: "NVIDIA L40",
    vendor: "NVIDIA",
    vram: "48 GB GDDR6",
    arch: "Ada Lovelace",
    tier: "datacenter",
    rateMin: 0.15,
    rateMax: 5,
    blurb:
      "The L40S's graphics-oriented sibling — same 48 GB, less tensor throughput, cheaper by the hour.",
  },
  {
    slug: "rtx-6000-ada",
    ticker: "6000-ADA",
    name: "NVIDIA RTX 6000 Ada",
    vendor: "NVIDIA",
    vram: "48 GB GDDR6",
    arch: "Ada Lovelace",
    tier: "workstation",
    buySlug: "rtx-6000-ada",
    rateMin: 0.2,
    rateMax: 5,
    blurb:
      "Workstation Ada with 48 GB. Common on per-GPU platforms where it undercuts the L40S for the same memory.",
  },
  {
    slug: "rtx-5090",
    ticker: "RTX-5090",
    name: "GeForce RTX 5090",
    vendor: "NVIDIA",
    vram: "32 GB GDDR7",
    arch: "Blackwell",
    tier: "workstation",
    buySlug: "rtx-5090",
    rateMin: 0.15,
    rateMax: 4,
    blurb:
      "Consumer Blackwell in a datacenter, which NVIDIA's licence terms discourage and the peer-to-peer market does anyway. The cheapest fast Blackwell you can rent.",
  },
  {
    slug: "rtx-4090",
    ticker: "RTX-4090",
    name: "GeForce RTX 4090",
    vendor: "NVIDIA",
    vram: "24 GB GDDR6X",
    arch: "Ada Lovelace",
    tier: "workstation",
    buySlug: "rtx-4090",
    rateMin: 0.1,
    rateMax: 3,
    blurb:
      "The workhorse of the peer-to-peer rental market. Nothing else gets you this much throughput per dollar-hour if 24 GB is enough.",
  },
  {
    slug: "a6000",
    ticker: "A6000",
    name: "NVIDIA RTX A6000",
    vendor: "NVIDIA",
    vram: "48 GB GDDR6",
    arch: "Ampere",
    tier: "workstation",
    buySlug: "rtx-a6000",
    rateMin: 0.1,
    rateMax: 4,
    blurb:
      "Ampere workstation card with 48 GB. Old, cheap and abundant — often the lowest cost per GB of VRAM on the whole board.",
  },
  {
    slug: "a40",
    ticker: "A40",
    name: "NVIDIA A40",
    vendor: "NVIDIA",
    vram: "48 GB GDDR6",
    arch: "Ampere",
    tier: "datacenter",
    rateMin: 0.08,
    rateMax: 4,
    blurb: "The A6000's datacenter twin — same 48 GB, passively cooled, rented cheaply.",
  },
  {
    slug: "a5000",
    ticker: "A5000",
    name: "NVIDIA RTX A5000",
    vendor: "NVIDIA",
    vram: "24 GB GDDR6",
    arch: "Ampere",
    tier: "workstation",
    rateMin: 0.05,
    rateMax: 3,
    blurb: "24 GB Ampere workstation card, common on budget GPU clouds.",
  },
  {
    slug: "a4000",
    ticker: "A4000",
    name: "NVIDIA RTX A4000",
    vendor: "NVIDIA",
    vram: "16 GB GDDR6",
    arch: "Ampere",
    tier: "workstation",
    rateMin: 0.03,
    rateMax: 2,
    blurb: "The entry point of the professional rental market — cheap 16 GB capacity.",
  },
  {
    slug: "l4",
    ticker: "L4",
    name: "NVIDIA L4",
    vendor: "NVIDIA",
    vram: "24 GB GDDR6",
    arch: "Ada Lovelace",
    tier: "datacenter",
    rateMin: 0.03,
    rateMax: 5,
    blurb:
      "Low-power 24 GB inference card. The default cheap accelerator at the hyperscalers.",
  },
  {
    slug: "a10g",
    ticker: "A10G",
    name: "NVIDIA A10 / A10G",
    vendor: "NVIDIA",
    vram: "24 GB GDDR6",
    arch: "Ampere",
    tier: "datacenter",
    rateMin: 0.03,
    rateMax: 6,
    blurb:
      "AWS's long-serving 24 GB inference and graphics card, still the volume part of the G family.",
  },
  {
    slug: "v100-32gb",
    ticker: "V100-32",
    name: "NVIDIA Tesla V100 32GB",
    vendor: "NVIDIA",
    vram: "32 GB HBM2",
    arch: "Volta",
    tier: "datacenter",
    buySlug: "v100-32gb",
    rateMin: 0.02,
    rateMax: 5,
    blurb:
      "Volta, still rentable a decade on. Priced against its electricity bill more than its performance.",
  },
  {
    slug: "v100-16gb",
    ticker: "V100-16",
    name: "NVIDIA Tesla V100 16GB",
    vendor: "NVIDIA",
    vram: "16 GB HBM2",
    arch: "Volta",
    tier: "datacenter",
    rateMin: 0.01,
    rateMax: 4,
    blurb: "The original V100. The cheapest datacenter-grade GPU still on offer.",
  },
];

const BY_SLUG = new Map(RENT_MODELS.map((m) => [m.slug, m]));

export const rentModelBySlug = (slug: string): RentModel | undefined =>
  BY_SLUG.get(slug);

/** Rental model that corresponds to a tracked buy-side part, if any. */
export const rentModelForBuySlug = (buySlug: string): RentModel | undefined =>
  RENT_MODELS.find((m) => m.buySlug === buySlug);

/** Slugs an adapter is allowed to emit — guards against typos in mapping tables. */
export const isRentModel = (slug: string): boolean => BY_SLUG.has(slug);

export const TIER_LABEL: Record<RentTier, string> = {
  frontier: "Frontier AI",
  datacenter: "Datacenter",
  workstation: "Workstation & consumer",
};
