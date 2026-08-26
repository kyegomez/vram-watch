import type { MetadataRoute } from "next";
import {
  BRAND_BG,
  BRAND_COLOR,
  SITE_DESCRIPTION_SHORT,
  SITE_NAME,
  SITE_TITLE,
} from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_TITLE,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION_SHORT,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: BRAND_BG,
    theme_color: BRAND_COLOR,
    orientation: "portrait-primary",
    categories: ["shopping", "finance", "utilities"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
