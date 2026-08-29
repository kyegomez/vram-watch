import { fetchHtml } from "../../adapters/http";
import type { RentalOffer, RentalSourceAdapter } from "../types";

/**
 * Shadeform catalog adapter — the widest single feed on the rental side.
 *
 * Shadeform brokers capacity across a dozen-plus GPU clouds and publishes the
 * whole catalog at a public, unauthenticated endpoint: every instance shape,
 * its live hourly rate, and per-region availability, attributed to the cloud
 * that actually operates it. Most of those clouds (Lambda, Crusoe, Nebius,
 * Voltage Park, Denvr…) publish no pricing API of their own, so this one call
 * replaces a dozen brittle marketing-page scrapers.
 *
 * Prices are attributed to the operating cloud, never to Shadeform.
 *
 * Unit gotcha: `hourly_price` is in CENTS. An 8-way H100 node at Lambda comes
 * back as 3192, meaning $31.92/hour, or $3.99 per GPU-hour.
 */

const ENDPOINT = "https://api.shadeform.ai/v1/instances/types";

/** Cents per hour → dollars per hour. */
const CENTS = 100;

interface ShadeAvailability {
  region: string;
  available: boolean;
  display_name?: string;
}

interface ShadeInstanceType {
  cloud: string;
  shade_instance_type: string;
  cloud_instance_type?: string;
  gpu_type: string;
  num_gpus: number;
  interconnect?: string;
  hourly_price: number;
  availability?: ShadeAvailability[];
}

/**
 * Shadeform's GPU vocabulary → our model slugs.
 *
 * `H100` and `A100` are ambiguous on their own — Shadeform distinguishes the
 * SXM and PCIe variants only through `interconnect`, and those rent at
 * genuinely different rates, so they resolve through `resolve()` below rather
 * than this table. Anything absent here (A16, A30, GAUDI2, RTX6000,
 * RTX4000Ada, CPU) is deliberately unmapped and skipped.
 */
const DIRECT: Record<string, string> = {
  H100_nvl: "h100-nvl",
  H200: "h200",
  B200: "b200",
  B300: "b300",
  GH200: "gh200",
  A100_80G: "a100-80gb",
  L40S: "l40s",
  L40: "l40",
  L4: "l4",
  A10: "a10g",
  A40: "a40",
  A6000: "a6000",
  A5000: "a5000",
  A4000: "a4000",
  RTX4090: "rtx-4090",
  RTX5090: "rtx-5090",
  RTX6000Ada: "rtx-6000-ada",
  RTXPro6000: "rtx-pro-6000",
  V100: "v100-16gb",
  V100_32G: "v100-32gb",
};

function resolve(gpuType: string, interconnect?: string): string | null {
  // The SXM/PCIe split is a real price difference, so it decides the model.
  if (gpuType === "H100") {
    return interconnect?.startsWith("sxm") ? "h100-sxm" : "h100-pcie";
  }
  if (gpuType === "A100") return "a100-40gb";
  return DIRECT[gpuType] ?? null;
}

export const shadeform: RentalSourceAdapter = {
  id: "shadeform",

  async fetchOffers(): Promise<RentalOffer[]> {
    const body = await fetchHtml(ENDPOINT);

    let types: ShadeInstanceType[];
    try {
      types = JSON.parse(body)?.instance_types ?? [];
    } catch {
      throw new Error("shadeform: /v1/instances/types did not return JSON");
    }

    const offers: RentalOffer[] = [];
    for (const t of types) {
      const modelSlug = resolve(t.gpu_type, t.interconnect);
      if (!modelSlug || !t.num_gpus || t.num_gpus < 1) continue;

      const nodeHour = t.hourly_price / CENTS;
      if (!Number.isFinite(nodeHour) || nodeHour <= 0) continue;

      // A shape is bookable if any of its regions currently has capacity;
      // the region we name is the one you'd actually get.
      const regions = t.availability ?? [];
      const live = regions.find((r) => r.available);
      const shown = live ?? regions[0];

      offers.push({
        providerId: t.cloud,
        modelSlug,
        gpuCount: t.num_gpus,
        nodeHour,
        perGpuHour: nodeHour / t.num_gpus,
        instance: t.cloud_instance_type || t.shade_instance_type,
        interconnect: t.interconnect,
        region: shown?.display_name || shown?.region,
        available: regions.length > 0 ? Boolean(live) : undefined,
      });
    }
    return offers;
  },
};
