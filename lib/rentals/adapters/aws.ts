import { fetchHtml } from "../../adapters/http";
import type { RentalOffer, RentalSourceAdapter } from "../types";

/**
 * AWS EC2 adapter.
 *
 * AWS's Price List *Query* API needs signed IAM credentials, but the feed that
 * backs the public pricing calculator does not — it's a plain JSON document of
 * on-demand Linux rates per region, and it's what we read here.
 *
 * The price is fetched live; the GPU count per instance type is a static table
 * below, because AWS's pricing feed doesn't publish accelerator counts. That
 * mapping is a documented, slow-moving property of each instance family, and
 * getting it wrong would silently scale every per-GPU rate — so unknown
 * families are skipped rather than guessed at.
 */

const REGION = "US East (N. Virginia)";
const ENDPOINT =
  "https://b0.p.awsstatic.com/pricing/2.0/meteredUnitMaps/ec2/USD/current/" +
  `ec2-ondemand-without-sec-sel/${encodeURIComponent(REGION)}/Linux/index.json`;

/** EC2 instance type → the GPU it carries and how many. */
const INSTANCES: Record<string, { model: string; gpus: number }> = {
  // Hopper
  "p5.4xlarge": { model: "h100-sxm", gpus: 1 },
  "p5.48xlarge": { model: "h100-sxm", gpus: 8 },
  "p5e.48xlarge": { model: "h200", gpus: 8 },
  "p5en.48xlarge": { model: "h200", gpus: 8 },
  // Blackwell
  "p6-b200.48xlarge": { model: "b200", gpus: 8 },
  // Ampere
  "p4d.24xlarge": { model: "a100-40gb", gpus: 8 },
  "p4de.24xlarge": { model: "a100-80gb", gpus: 8 },
  // Volta
  "p3.2xlarge": { model: "v100-16gb", gpus: 1 },
  "p3.8xlarge": { model: "v100-16gb", gpus: 4 },
  "p3.16xlarge": { model: "v100-16gb", gpus: 8 },
  "p3dn.24xlarge": { model: "v100-32gb", gpus: 8 },
  // G family — A10G
  "g5.xlarge": { model: "a10g", gpus: 1 },
  "g5.2xlarge": { model: "a10g", gpus: 1 },
  "g5.4xlarge": { model: "a10g", gpus: 1 },
  "g5.8xlarge": { model: "a10g", gpus: 1 },
  "g5.16xlarge": { model: "a10g", gpus: 1 },
  "g5.12xlarge": { model: "a10g", gpus: 4 },
  "g5.24xlarge": { model: "a10g", gpus: 4 },
  "g5.48xlarge": { model: "a10g", gpus: 8 },
  // G family — L4
  "g6.xlarge": { model: "l4", gpus: 1 },
  "g6.2xlarge": { model: "l4", gpus: 1 },
  "g6.4xlarge": { model: "l4", gpus: 1 },
  "g6.8xlarge": { model: "l4", gpus: 1 },
  "g6.16xlarge": { model: "l4", gpus: 1 },
  "g6.12xlarge": { model: "l4", gpus: 4 },
  "g6.24xlarge": { model: "l4", gpus: 4 },
  "g6.48xlarge": { model: "l4", gpus: 8 },
  "gr6.4xlarge": { model: "l4", gpus: 1 },
  "gr6.8xlarge": { model: "l4", gpus: 1 },
  // G family — L40S
  "g6e.xlarge": { model: "l40s", gpus: 1 },
  "g6e.2xlarge": { model: "l40s", gpus: 1 },
  "g6e.4xlarge": { model: "l40s", gpus: 1 },
  "g6e.8xlarge": { model: "l40s", gpus: 1 },
  "g6e.16xlarge": { model: "l40s", gpus: 1 },
  "g6e.12xlarge": { model: "l40s", gpus: 4 },
  "g6e.24xlarge": { model: "l40s", gpus: 4 },
  "g6e.48xlarge": { model: "l40s", gpus: 8 },
};

interface AwsRate {
  price: string;
  "Instance Type": string;
}

export const aws: RentalSourceAdapter = {
  id: "aws",

  async fetchOffers(): Promise<RentalOffer[]> {
    const body = await fetchHtml(ENDPOINT);

    let rates: Record<string, AwsRate>;
    try {
      rates = JSON.parse(body)?.regions?.[REGION] ?? {};
    } catch {
      throw new Error("aws: pricing feed did not return JSON");
    }

    // The feed keys on a rate code, and one instance type can appear more than
    // once; keep the lowest on-demand rate we see for each.
    const cheapest = new Map<string, number>();
    for (const rate of Object.values(rates)) {
      const type = rate["Instance Type"];
      const spec = INSTANCES[type];
      if (!spec) continue;
      const price = Number.parseFloat(rate.price);
      if (!Number.isFinite(price) || price <= 0) continue;
      const prev = cheapest.get(type);
      if (prev === undefined || price < prev) cheapest.set(type, price);
    }

    return [...cheapest].map(([type, nodeHour]) => {
      const { model, gpus } = INSTANCES[type];
      return {
        providerId: "aws",
        modelSlug: model,
        gpuCount: gpus,
        nodeHour,
        perGpuHour: nodeHour / gpus,
        instance: type,
        region: "us-east-1",
        url: "https://aws.amazon.com/ec2/instance-types/",
      };
    });
  },
};
