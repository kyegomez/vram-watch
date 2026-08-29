import type { RentalProvider } from "./types";

/**
 * Rental provider registry.
 *
 * Five adapters cover every provider here. Four talk to one provider each
 * (AWS, Azure, RunPod, Vast.ai); the fifth reads Shadeform's public catalog,
 * which publishes live rates and per-region availability for a dozen-plus
 * GPU clouds that have no public pricing API of their own. Prices are always
 * attributed to the cloud that actually charges them, never to Shadeform.
 *
 * Every provider below is fetched live — there are no link-only entries on the
 * rental side, because unlike retail storefronts, none of these feeds block us.
 */
export const PROVIDERS: RentalProvider[] = [
  // ---- hyperscalers: list price, deep capacity, the ceiling of the market ----
  {
    id: "aws",
    name: "AWS",
    kind: "hyperscaler",
    via: "aws",
    homepage: "https://aws.amazon.com",
    rentUrl: "https://aws.amazon.com/ec2/instance-types/",
    note:
      "EC2 accelerated instances (P and G families) at public on-demand list price for us-east-1, read from the same pricing feed that backs the AWS calculator. The most expensive way to rent an H100 by the hour, and the most available.",
  },
  {
    id: "azure",
    name: "Microsoft Azure",
    kind: "hyperscaler",
    via: "azure",
    homepage: "https://azure.microsoft.com",
    rentUrl:
      "https://azure.microsoft.com/en-us/pricing/details/virtual-machines/linux/",
    note:
      "ND and NC series VMs at pay-as-you-go Linux list price for East US, from Azure's public Retail Prices API. Windows, spot and low-priority meters are filtered out so the rate is comparable to everyone else's on-demand price.",
  },

  // ---- per-GPU platforms and peer-to-peer markets: the floor ----
  {
    id: "runpod",
    name: "RunPod",
    kind: "platform",
    via: "runpod",
    homepage: "https://www.runpod.io",
    rentUrl: "https://www.runpod.io/pricing",
    note:
      "Container platform renting single GPUs by the second across Secure Cloud and Community Cloud. Its public GraphQL endpoint returns the lowest live on-demand and interruptible rate per GPU model.",
  },
  {
    id: "vastai",
    name: "Vast.ai",
    kind: "marketplace",
    via: "vastai",
    homepage: "https://vast.ai",
    rentUrl: "https://cloud.vast.ai/create/",
    note:
      "Peer-to-peer market where independent hosts set their own price, so it is almost always the cheapest quote on the board — and the most variable in reliability, location and uptime. Only offers listed as rentable are quoted.",
  },

  // ---- dedicated GPU clouds, read through Shadeform's public catalog ----
  {
    id: "lambdalabs",
    name: "Lambda",
    kind: "neocloud",
    via: "shadeform",
    homepage: "https://lambda.ai",
    rentUrl: "https://lambda.ai/service/gpu-cloud",
    note:
      "One of the original GPU clouds. Publishes flat per-GPU pricing on 8-way H100 and B200 nodes with no commitment, and is usually the reference rate the rest of the neocloud market prices against.",
  },
  {
    id: "crusoe",
    name: "Crusoe",
    kind: "neocloud",
    via: "shadeform",
    homepage: "https://www.crusoe.ai",
    rentUrl: "https://www.crusoe.ai/cloud",
    note:
      "Energy-first GPU cloud running on stranded and flared power. Competitive on 8-way H100/H200 nodes with InfiniBand.",
  },
  {
    id: "nebius",
    name: "Nebius",
    kind: "neocloud",
    via: "shadeform",
    homepage: "https://nebius.com",
    rentUrl: "https://nebius.com/prices",
    note:
      "European AI cloud with large NVLink-connected H100/H200 and B200 fleets, sold both on demand and on reserved contracts.",
  },
  {
    id: "voltagepark",
    name: "Voltage Park",
    kind: "neocloud",
    via: "shadeform",
    homepage: "https://voltagepark.com",
    rentUrl: "https://voltagepark.com/pricing",
    note:
      "Non-profit-backed operator of a very large H100 fleet, consistently among the cheapest on-demand 8-way H100 rates published anywhere.",
  },
  {
    id: "hyperstack",
    name: "Hyperstack",
    kind: "neocloud",
    via: "shadeform",
    homepage: "https://www.hyperstack.cloud",
    rentUrl: "https://www.hyperstack.cloud/gpu-pricing",
    note:
      "NexGen Cloud's GPU-as-a-service platform, with broad coverage from A4000 through H100 and RTX PRO 6000.",
  },
  {
    id: "denvr",
    name: "Denvr Dataworks",
    kind: "neocloud",
    via: "shadeform",
    homepage: "https://www.denvr.com",
    rentUrl: "https://www.denvr.com/pricing",
    note:
      "North American AI cloud running H100, A100 and Intel Gaudi capacity on demand.",
  },
  {
    id: "massedcompute",
    name: "Massed Compute",
    kind: "neocloud",
    via: "shadeform",
    homepage: "https://massedcompute.com",
    rentUrl: "https://massedcompute.com/gpu-pricing/",
    note:
      "Bare-metal and virtualized GPU rentals with unusually deep A6000, A5000 and L40S inventory.",
  },
  {
    id: "latitude",
    name: "Latitude.sh",
    kind: "neocloud",
    via: "shadeform",
    homepage: "https://www.latitude.sh",
    rentUrl: "https://www.latitude.sh/accelerate",
    note:
      "Bare-metal cloud with GPU nodes across the Americas, Europe and Asia.",
  },
  {
    id: "paperspace",
    name: "Paperspace",
    kind: "neocloud",
    via: "shadeform",
    homepage: "https://www.paperspace.com",
    rentUrl: "https://www.paperspace.com/pricing",
    note:
      "DigitalOcean's GPU arm. Strong on single-GPU workstation-class rentals (A4000 through A100) billed by the second.",
  },
  {
    id: "digitalocean",
    name: "DigitalOcean",
    kind: "neocloud",
    via: "shadeform",
    homepage: "https://www.digitalocean.com",
    rentUrl: "https://www.digitalocean.com/products/gpu-droplets",
    note:
      "GPU Droplets — H100 and MI300X nodes sold on the same simple hourly model as the rest of DigitalOcean.",
  },
  {
    id: "scaleway",
    name: "Scaleway",
    kind: "neocloud",
    via: "shadeform",
    homepage: "https://www.scaleway.com",
    rentUrl: "https://www.scaleway.com/en/gpu-instances/",
    note:
      "French cloud provider with EU-resident H100, L40S and L4 instances.",
  },
  {
    id: "vultr",
    name: "Vultr",
    kind: "neocloud",
    via: "shadeform",
    homepage: "https://www.vultr.com",
    rentUrl: "https://www.vultr.com/pricing/#cloud-gpu",
    note:
      "Global edge cloud renting fractional and whole GPUs across a wide region footprint.",
  },
];

const BY_ID = new Map(PROVIDERS.map((p) => [p.id, p]));

/**
 * Shadeform's catalog carries smaller partner clouds that have no public
 * presence for us to link to. Rather than invent a homepage for them, they
 * resolve to a generated entry that says exactly what it is and points at the
 * catalog the price came from — the price is still real and still theirs.
 */
function partnerProvider(id: string): RentalProvider {
  const name = id.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    id,
    name,
    kind: "neocloud",
    via: "shadeform",
    homepage: "https://shadeform.com",
    rentUrl: "https://shadeform.com",
    note:
      "Partner GPU cloud listed in Shadeform's public catalog. Its live rate and availability are real and quoted here, but it publishes no independent pricing page for us to link to.",
  };
}

const generated = new Map<string, RentalProvider>();

/** Never throws — an unrecognized Shadeform cloud resolves to a partner entry. */
export function providerById(id: string): RentalProvider {
  const known = BY_ID.get(id);
  if (known) return known;
  let made = generated.get(id);
  if (!made) {
    made = partnerProvider(id);
    generated.set(id, made);
  }
  return made;
}

export const isKnownProvider = (id: string): boolean => BY_ID.has(id);

export const KIND_LABEL: Record<RentalProvider["kind"], string> = {
  hyperscaler: "Hyperscaler",
  neocloud: "GPU cloud",
  platform: "GPU platform",
  marketplace: "Marketplace",
};
