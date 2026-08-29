import type { MetadataRoute } from "next";
import { GPUS } from "@/lib/gpus";
import { RENT_MODELS } from "@/lib/rentals/models";
import { SITE_URL } from "@/lib/site";
import { readMeta, readRentalMeta } from "@/lib/store";

/** Prices move all day — regenerate the sitemap hourly rather than at build. */
export const revalidate = 3600;

export default function sitemap(): MetadataRoute.Sitemap {
  const meta = readMeta();
  const lastModified = meta.lastRefresh ? new Date(meta.lastRefresh) : new Date();

  const rentalMeta = readRentalMeta();
  const rentModified = rentalMeta.lastRefresh
    ? new Date(rentalMeta.lastRefresh)
    : new Date();

  return [
    {
      url: `${SITE_URL}/`,
      lastModified,
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/sources`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/rent`,
      lastModified: rentModified,
      changeFrequency: "hourly" as const,
      priority: 0.9,
    },
    ...RENT_MODELS.map((model) => ({
      url: `${SITE_URL}/rent/${model.slug}`,
      lastModified: rentModified,
      changeFrequency: "hourly" as const,
      // Frontier accelerators are what the rental market is actually searched
      // for — nobody googles the hourly rate of an A4000.
      priority: model.tier === "frontier" ? 0.9 : 0.7,
    })),
    ...GPUS.map((gpu) => ({
      url: `${SITE_URL}/gpu/${gpu.slug}`,
      lastModified,
      changeFrequency: "hourly" as const,
      // Datacenter parts are the thin end of the demand curve; consumer cards
      // are what people actually search for.
      priority: gpu.category === "consumer" ? 0.9 : 0.8,
    })),
  ];
}
