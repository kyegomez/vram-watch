import { sleep } from "../../adapters/http";
import type { RentalOffer, RentalSourceAdapter } from "../types";

/**
 * Vast.ai adapter.
 *
 * Vast is a peer-to-peer market: independent hosts list machines and set their
 * own price, so it is usually the cheapest quote on the board and the widest
 * in quality. Its public bundles endpoint takes a JSON query, so unlike the
 * catalog feeds we ask per model rather than pulling everything — an
 * unfiltered listing is dominated by fractional slices of old consumer cards
 * and would never surface an H100 at all.
 *
 * Two filters matter and are not optional:
 *   `rentable` — Vast lists machines that are already occupied. Their price is
 *                not a price you can pay, so they're excluded at the query.
 *   `num_gpus` — hosts split single cards into fractional slices; a "$0.015
 *                RTX 3090" is a fraction of one. Dividing dph_total by
 *                num_gpus and applying the model's rate band drops those.
 */

const ENDPOINT = "https://console.vast.ai/api/v0/bundles/";
const PER_QUERY_DELAY_MS = 400;
const LIMIT = 12;

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

interface VastOffer {
  id: number;
  gpu_name: string;
  num_gpus: number;
  gpu_ram: number; // per-GPU VRAM in MB
  dph_total: number; // dollars per hour for the whole offer
  rentable: boolean;
  geolocation?: string;
}

/**
 * Our model → the `gpu_name` values Vast uses for it.
 *
 * `vramMin`/`vramMax` (per-GPU MB) split the names Vast reuses across memory
 * configurations: "A100 SXM4" covers both the 40 GB and 80 GB parts, and
 * "Tesla V100" covers both 16 GB and 32 GB, which are separate markets here.
 */
interface VastQuery {
  names: string[];
  vramMin?: number;
  vramMax?: number;
}

const QUERIES: Record<string, VastQuery> = {
  "h100-sxm": { names: ["H100 SXM"] },
  "h100-pcie": { names: ["H100 PCIE"] },
  "h100-nvl": { names: ["H100 NVL"] },
  h200: { names: ["H200"] },
  "h200-nvl": { names: ["H200 NVL"] },
  b200: { names: ["B200"] },
  b300: { names: ["B300"] },
  gh200: { names: ["GH200 SXM"] },
  mi300x: { names: ["MI300X"] },
  "a100-80gb": { names: ["A100 SXM4", "A100 PCIE", "A100X"], vramMin: 65_000 },
  "a100-40gb": { names: ["A100 SXM4", "A100 PCIE"], vramMax: 65_000 },
  l40s: { names: ["L40S"] },
  l40: { names: ["L40"] },
  l4: { names: ["L4"] },
  a40: { names: ["A40"] },
  a6000: { names: ["RTX A6000"] },
  a5000: { names: ["RTX A5000"] },
  a4000: { names: ["RTX A4000"] },
  "rtx-4090": { names: ["RTX 4090"] },
  "rtx-5090": { names: ["RTX 5090"] },
  "rtx-6000-ada": { names: ["RTX 6000Ada"] },
  "rtx-pro-6000": {
    names: ["RTX PRO 6000 S", "RTX PRO 6000 WS", "RTX PRO 6000 Max-Q"],
  },
  "v100-32gb": { names: ["Tesla V100"], vramMin: 24_000 },
  "v100-16gb": { names: ["Tesla V100"], vramMax: 24_000 },
};

async function search(gpuName: string): Promise<VastOffer[]> {
  const q = {
    rentable: { eq: true },
    gpu_name: { eq: gpuName },
    num_gpus: { gte: 1 },
    order: [["dph_total", "asc"]],
    limit: LIMIT,
  };
  const url = `${ENDPOINT}?q=${encodeURIComponent(JSON.stringify(q))}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`vastai: HTTP ${res.status} for ${gpuName}`);
  const json = (await res.json()) as { offers?: VastOffer[] };
  return json.offers ?? [];
}

export const vastai: RentalSourceAdapter = {
  id: "vastai",

  async fetchOffers(): Promise<RentalOffer[]> {
    const out: RentalOffer[] = [];

    for (const [modelSlug, spec] of Object.entries(QUERIES)) {
      for (const name of spec.names) {
        let raw: VastOffer[];
        try {
          raw = await search(name);
        } catch {
          // One sold-out or renamed GPU shouldn't cost us the whole provider.
          await sleep(PER_QUERY_DELAY_MS);
          continue;
        }

        for (const o of raw) {
          if (!o.rentable || !o.num_gpus || o.num_gpus < 1) continue;
          if (spec.vramMin !== undefined && o.gpu_ram < spec.vramMin) continue;
          if (spec.vramMax !== undefined && o.gpu_ram >= spec.vramMax) continue;
          if (!Number.isFinite(o.dph_total) || o.dph_total <= 0) continue;

          out.push({
            providerId: "vastai",
            modelSlug,
            gpuCount: o.num_gpus,
            nodeHour: o.dph_total,
            perGpuHour: o.dph_total / o.num_gpus,
            instance: `${o.gpu_name} x${o.num_gpus}`,
            region: o.geolocation?.replace(/^,\s*/, "") || undefined,
            available: true,
            url: `https://cloud.vast.ai/create/?offerId=${o.id}`,
          });
        }
        await sleep(PER_QUERY_DELAY_MS);
      }
    }
    return out;
  },
};
