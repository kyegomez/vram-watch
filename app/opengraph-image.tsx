import { ImageResponse } from "next/og";
import { GPUS } from "@/lib/gpus";
import { BRAND_BG, BRAND_COLOR, SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import { SOURCES } from "@/lib/sources";

export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const stats = [
    [String(GPUS.length), "parts tracked"],
    [String(SOURCES.length), "sources"],
    ["24h / 7d / 30d", "price history"],
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BRAND_BG,
          color: "#e6ece9",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 40, height: 40, background: BRAND_COLOR }} />
          <div style={{ fontSize: 40, letterSpacing: 8, fontWeight: 700 }}>
            {SITE_NAME}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1.05,
            }}
          >
            <span>Live GPU street prices</span>
            <span style={{ color: BRAND_COLOR }}>.</span>
          </div>
          <div style={{ fontSize: 30, color: "#93a39c", lineHeight: 1.4 }}>
            RTX 5090 to H200 — aggregated across retailers, resellers and the
            used market, with real price history and direct buy links.
          </div>
        </div>

        <div style={{ display: "flex", gap: 64 }}>
          {stats.map(([value, label]) => (
            <div
              key={label}
              style={{ display: "flex", flexDirection: "column", gap: 6 }}
            >
              <div style={{ fontSize: 40, fontWeight: 700 }}>{value}</div>
              <div
                style={{ fontSize: 22, color: "#5e6d66", letterSpacing: 2 }}
              >
                {label.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
