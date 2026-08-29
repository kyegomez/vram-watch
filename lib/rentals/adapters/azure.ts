import { fetchHtml } from "../../adapters/http";
import type { RentalOffer, RentalSourceAdapter } from "../types";

/**
 * Microsoft Azure adapter.
 *
 * Azure publishes a fully open Retail Prices API — no key, no account — that
 * returns every meter it bills. We ask for Virtual Machines in East US at
 * consumption (pay-as-you-go) rates and page through the result.
 *
 * Three meter variants have to be filtered out or the comparison is dishonest:
 * Windows meters (they bundle an OS licence), Spot, and Low Priority. What's
 * left is the Linux on-demand rate, which is what every other provider here
 * quotes.
 *
 * As with AWS, the price is live but the GPUs-per-SKU mapping is a static
 * table — Azure's price feed doesn't publish accelerator counts. Only SKUs
 * whose GPU count is unambiguous are mapped; the rest are skipped rather than
 * inferred from vCPU counts, since a wrong count silently scales the per-GPU
 * rate.
 */

const ENDPOINT = "https://prices.azure.com/api/retail/prices";
const REGION = "eastus";
const MAX_PAGES = 12;

/** Azure VM SKU → the GPU it carries and how many. */
const SKUS: Record<string, { model: string; gpus: number }> = {
  // ND H100 v5 — 8-way SXM, with and without InfiniBand
  Standard_ND96isr_H100_v5: { model: "h100-sxm", gpus: 8 },
  Standard_ND96isrf_H100_v5: { model: "h100-sxm", gpus: 8 },
  Standard_ND96is_H100_v5: { model: "h100-sxm", gpus: 8 },
  Standard_ND96is_flex_H100_v5: { model: "h100-sxm", gpus: 8 },
  Standard_ND96is_noIB_H100_v5: { model: "h100-sxm", gpus: 8 },
  // NC H100 v5 — the NVL part, 1 and 2 GPU shapes
  Standard_NC40ads_H100_v5: { model: "h100-nvl", gpus: 1 },
  Standard_NC80adis_H100_v5: { model: "h100-nvl", gpus: 2 },
  // ND A100 v4 — 8-way, 40 GB and 80 GB
  Standard_ND96asr_v4: { model: "a100-40gb", gpus: 8 },
  Standard_ND96asr_A100_v4: { model: "a100-40gb", gpus: 8 },
  Standard_ND96amsr_A100_v4: { model: "a100-80gb", gpus: 8 },
  Standard_ND96ams_A100_v4: { model: "a100-80gb", gpus: 8 },
  // NCads A100 v4 — 80 GB PCIe, 1/2/4 GPU shapes
  Standard_NC24ads_A100_v4: { model: "a100-80gb", gpus: 1 },
  Standard_NC48ads_A100_v4: { model: "a100-80gb", gpus: 2 },
  Standard_NC96ads_A100_v4: { model: "a100-80gb", gpus: 4 },
  // NCSv3 — V100 16 GB
  Standard_NC6s_v3: { model: "v100-16gb", gpus: 1 },
  Standard_NC12s_v3: { model: "v100-16gb", gpus: 2 },
  Standard_NC24s_v3: { model: "v100-16gb", gpus: 4 },
  Standard_NC24rs_v3: { model: "v100-16gb", gpus: 4 },
  // NDv2 — 8-way V100 32 GB
  Standard_ND40rs_v2: { model: "v100-32gb", gpus: 8 },
  Standard_ND40s_v2: { model: "v100-32gb", gpus: 8 },
};

interface AzureItem {
  armSkuName: string;
  skuName: string;
  productName: string;
  retailPrice: number;
  unitOfMeasure: string;
  armRegionName: string;
}

/**
 * Windows meters carry an OS licence and Spot/Low Priority are interruptible —
 * none of them compare to the on-demand Linux rate everyone else quotes.
 */
const isPlainLinuxOnDemand = (i: AzureItem): boolean =>
  !/windows/i.test(i.productName) &&
  !/\bspot\b/i.test(i.skuName) &&
  !/low priority/i.test(i.skuName);

export const azure: RentalSourceAdapter = {
  id: "azure",

  async fetchOffers(): Promise<RentalOffer[]> {
    const filter =
      `serviceName eq 'Virtual Machines' and armRegionName eq '${REGION}'` +
      " and priceType eq 'Consumption'";

    let url: string | null =
      `${ENDPOINT}?${new URLSearchParams({ $filter: filter })}`;

    // Keep the lowest qualifying rate per SKU across all pages.
    const cheapest = new Map<string, number>();

    for (let page = 0; url && page < MAX_PAGES; page++) {
      const body = await fetchHtml(url);
      let data: { Items?: AzureItem[]; NextPageLink?: string | null };
      try {
        data = JSON.parse(body);
      } catch {
        throw new Error("azure: retail prices API did not return JSON");
      }

      for (const item of data.Items ?? []) {
        if (!SKUS[item.armSkuName]) continue;
        if (!isPlainLinuxOnDemand(item)) continue;
        if (!/hour/i.test(item.unitOfMeasure)) continue;
        if (!Number.isFinite(item.retailPrice) || item.retailPrice <= 0) continue;

        const prev = cheapest.get(item.armSkuName);
        if (prev === undefined || item.retailPrice < prev) {
          cheapest.set(item.armSkuName, item.retailPrice);
        }
      }
      url = data.NextPageLink ?? null;
    }

    return [...cheapest].map(([sku, nodeHour]) => {
      const { model, gpus } = SKUS[sku];
      return {
        providerId: "azure",
        modelSlug: model,
        gpuCount: gpus,
        nodeHour,
        perGpuHour: nodeHour / gpus,
        instance: sku.replace(/^Standard_/, ""),
        region: REGION,
        url: "https://azure.microsoft.com/en-us/pricing/details/virtual-machines/linux/",
      };
    });
  },
};
