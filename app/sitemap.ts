import type { MetadataRoute } from "next";
import { GPUS } from "@/lib/gpus";
import { SITE_URL } from "@/lib/site";
import { readMeta } from "@/lib/store";

/** Prices move all day — regenerate the sitemap hourly rather than at build. */
export const revalidate = 3600;

export default function sitemap(): MetadataRoute.Sitemap {
  const meta = readMeta();
  const lastModified = meta.lastRefresh ? new Date(meta.lastRefresh) : new Date();

  return [
    {
      url: `${SITE_URL}/`,
      lastModified,
      changeFrequency: "hourly",
      priority: 1,
    },
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
