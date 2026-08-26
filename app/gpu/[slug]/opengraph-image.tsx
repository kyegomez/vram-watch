import { ImageResponse } from "next/og";
import { pct, usd } from "@/lib/format";
import { CATEGORY_LABEL, gpuBySlug } from "@/lib/gpus";
import { buildQuote } from "@/lib/quotes";
import { BRAND_BG, BRAND_COLOR, SITE_NAME } from "@/lib/site";
import { sourceById } from "@/lib/sources";

export const alt = "GPU price card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
/** Prices move — let the card refresh rather than freezing at build time. */
export const revalidate = 600;

export default async function GpuOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const gpu = gpuBySlug((await params).slug);

  if (!gpu) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: BRAND_BG,
            color: "#e6ece9",
            fontSize: 64,
            fontFamily: "sans-serif",
          }}
        >
          {SITE_NAME}
        </div>
      ),
      size
    );
  }

  const quote = buildQuote(gpu);
  const delta = quote.delta24h;
  const deltaColor =
    delta === null || Math.abs(delta) < 0.0005
      ? "#93a39c"
      : delta < 0
        ? BRAND_COLOR
        : "#e0685c";

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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 32, height: 32, background: BRAND_COLOR }} />
            <div style={{ fontSize: 30, letterSpacing: 7, fontWeight: 700 }}>
              {SITE_NAME}
            </div>
          </div>
          <div style={{ fontSize: 24, color: "#5e6d66", letterSpacing: 3 }}>
            {CATEGORY_LABEL[gpu.category].toUpperCase()}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 28, color: BRAND_COLOR, letterSpacing: 4 }}>
            {gpu.ticker}
          </div>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.05 }}>
            {gpu.name}
          </div>
          <div style={{ fontSize: 26, color: "#93a39c" }}>
            {`${gpu.vram} · ${gpu.arch} · ${gpu.vendor}`}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 22, color: "#5e6d66", letterSpacing: 3 }}>
              BEST PRICE
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
              <div style={{ fontSize: 86, fontWeight: 700 }}>
                {quote.best !== null ? usd(quote.best) : "—"}
              </div>
              {delta !== null && (
                <div style={{ fontSize: 34, color: deltaColor }}>
                  {`${pct(delta)} 24h`}
                </div>
              )}
            </div>
          </div>
          <div style={{ fontSize: 24, color: "#93a39c" }}>
            {quote.bestSourceId
              ? `at ${sourceById(quote.bestSourceId).name}`
              : `${gpu.sources.length} sources tracked`}
          </div>
        </div>
      </div>
    ),
    size
  );
}
