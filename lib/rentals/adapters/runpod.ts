import type { RentalOffer, RentalSourceAdapter } from "../types";

/**
 * RunPod adapter.
 *
 * RunPod's public GraphQL endpoint answers an unauthenticated `gpuTypes`
 * query with every GPU it rents and the lowest current rate for each, across
 * both Secure Cloud and Community Cloud. Two rates come back per model:
 * `uninterruptablePrice` (on-demand) and `minimumBidPrice` (interruptible
 * spot). We quote on-demand as the headline and record spot alongside it.
 *
 * RunPod rents per GPU, not per node, so every offer here is gpuCount 1 —
 * which is exactly why it tends to set the floor for single-GPU work.
 */

const ENDPOINT = "https://api.runpod.io/graphql";

const QUERY = `query {
  gpuTypes {
    id
    displayName
    memoryInGb
    secureCloud
    communityCloud
    lowestPrice(input: { gpuCount: 1 }) {
      minimumBidPrice
      uninterruptablePrice
    }
  }
}`;

interface GpuType {
  id: string;
  displayName: string;
  lowestPrice: {
    minimumBidPrice: number | null;
    uninterruptablePrice: number | null;
  } | null;
}

/**
 * RunPod's `id` strings are the raw CUDA device names, so they're stable and
 * worth matching exactly rather than by fuzzy substring — "NVIDIA H100 PCIe",
 * "NVIDIA H100 NVL" and "NVIDIA H100 80GB HBM3" (which is the SXM part) would
 * all collide under a naive `includes("H100")`.
 */
const BY_ID: Record<string, string> = {
  "NVIDIA H100 80GB HBM3": "h100-sxm",
  "NVIDIA H100 PCIe": "h100-pcie",
  "NVIDIA H100 NVL": "h100-nvl",
  "NVIDIA H200": "h200",
  "NVIDIA H200 NVL": "h200-nvl",
  "NVIDIA B200": "b200",
  "NVIDIA B300 SXM6 AC": "b300",
  "AMD Instinct MI300X OAM": "mi300x",
  "NVIDIA A100 80GB PCIe": "a100-80gb",
  "NVIDIA A100-SXM4-80GB": "a100-80gb",
  "NVIDIA A100-SXM4-40GB": "a100-40gb",
  "NVIDIA A40": "a40",
  "NVIDIA L40S": "l40s",
  "NVIDIA L40": "l40",
  "NVIDIA L4": "l4",
  "NVIDIA RTX 6000 Ada Generation": "rtx-6000-ada",
  "NVIDIA RTX A6000": "a6000",
  "NVIDIA RTX A5000": "a5000",
  "NVIDIA RTX A4000": "a4000",
  "NVIDIA GeForce RTX 4090": "rtx-4090",
  "NVIDIA GeForce RTX 5090": "rtx-5090",
  "Tesla V100-PCIE-16GB": "v100-16gb",
  "Tesla V100-SXM2-16GB": "v100-16gb",
  // The Server Edition is the part that competes with an L40S/H100 for
  // inference; the Max-Q and Workstation editions are the same silicon at a
  // lower power cap, and the market prices them as one.
  "NVIDIA RTX PRO 6000 Blackwell Server Edition": "rtx-pro-6000",
  "NVIDIA RTX PRO 6000 Blackwell Workstation Edition": "rtx-pro-6000",
  "NVIDIA RTX PRO 6000 Blackwell Max-Q Workstation Edition": "rtx-pro-6000",
};

export const runpod: RentalSourceAdapter = {
  id: "runpod",

  async fetchOffers(): Promise<RentalOffer[]> {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: QUERY }),
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`runpod: HTTP ${res.status}`);

    const json = (await res.json()) as {
      data?: { gpuTypes?: GpuType[] };
      errors?: { message: string }[];
    };
    if (json.errors?.length) throw new Error(`runpod: ${json.errors[0].message}`);

    const offers: RentalOffer[] = [];
    for (const g of json.data?.gpuTypes ?? []) {
      const modelSlug = BY_ID[g.id];
      if (!modelSlug) continue;

      const onDemand = g.lowestPrice?.uninterruptablePrice;
      const bid = g.lowestPrice?.minimumBidPrice;

      // A model with no rate right now is sold out, not free.
      if (typeof onDemand === "number" && onDemand > 0) {
        offers.push({
          providerId: "runpod",
          modelSlug,
          gpuCount: 1,
          nodeHour: onDemand,
          perGpuHour: onDemand,
          instance: g.displayName,
          available: true,
          url: "https://www.runpod.io/pricing",
        });
      }
      // Spot is a genuinely different product; only record it when it
      // actually undercuts on-demand, which is the only time it matters.
      if (typeof bid === "number" && bid > 0 && (!onDemand || bid < onDemand)) {
        offers.push({
          providerId: "runpod",
          modelSlug,
          gpuCount: 1,
          nodeHour: bid,
          perGpuHour: bid,
          instance: `${g.displayName} (spot)`,
          available: true,
          spot: true,
          url: "https://www.runpod.io/pricing",
        });
      }
    }
    return offers;
  },
};
