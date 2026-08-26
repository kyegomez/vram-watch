import { ImageResponse } from "next/og";
import { BRAND_COLOR } from "@/lib/site";

// The green box, rasterized for iOS home screens (Apple won't take SVG).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{ width: "100%", height: "100%", background: BRAND_COLOR }}
      />
    ),
    size
  );
}
