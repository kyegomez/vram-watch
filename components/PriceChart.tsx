"use client";

import { useMemo, useRef, useState } from "react";
import { rate as rateFmt, shortDate, usd } from "@/lib/format";

export interface ChartSeries {
  id: string;
  name: string;
  color: string;
  points: { date: string; price: number }[];
}

const W = 840;
const H = 380;
const PAD = { l: 64, r: 20, t: 18, b: 34 };
const DAY = 86_400_000;

const ts = (date: string) => Date.parse(`${date}T00:00:00Z`);

/** A dashed horizontal marker — MSRP on a price chart, a buy-breakeven on a rate chart. */
export interface ChartReference {
  value: number;
  label: string;
}

/**
 * How values on this chart are written. A mode rather than a formatter
 * function, because this is a client component and a server page can't hand a
 * function across the boundary.
 */
export type ChartFormat = "price" | "rate";

/**
 * Axis ticks and readouts want different precision. A tick sits under a
 * gridline where "$2.00" is the useful label; the hover readout is comparing
 * providers, where the third decimal is often the entire difference between
 * two hosts.
 */
const FORMATTERS: Record<
  ChartFormat,
  { tick: (v: number) => string; value: (v: number) => string }
> = {
  price: {
    tick: (v) => (v >= 10_000 ? `$${(v / 1000).toFixed(1)}k` : usd(v)),
    value: usd,
  },
  rate: {
    tick: (v) => (v >= 10 ? `$${v.toFixed(0)}` : `$${v.toFixed(2)}`),
    value: rateFmt,
  },
};

function niceTicks(min: number, max: number, target = 4): number[] {
  const span = max - min || 1;
  const raw = span / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= target + 1) ?? mag * 10;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(v);
  return out;
}

const RANGES = [
  { key: "7", label: "7D", days: 7 },
  { key: "30", label: "30D", days: 30 },
  { key: "90", label: "90D", days: 90 },
  { key: "all", label: "ALL", days: Infinity },
] as const;

/**
 * Shared by both markets: the retail board charts daily low prices per source,
 * the rental board charts daily low hourly rates per provider. They differ
 * only in how a value is formatted and what the reference line means, so both
 * are props rather than a second copy of this component.
 */
export default function PriceChart({
  series,
  reference = null,
  format = "price",
  emptyLabel = "No snapshots yet — run a refresh to start recording history.",
  ariaLabel = "Price history by source",
}: {
  series: ChartSeries[];
  reference?: ChartReference | null;
  format?: ChartFormat;
  emptyLabel?: string;
  ariaLabel?: string;
}) {
  const { tick: fmtTick, value: fmtValue } = FORMATTERS[format];
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("all");
  const [hover, setHover] = useState<{ day: number; px: number; py: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const model = useMemo(() => {
    const days = RANGES.find((r) => r.key === range)!.days;
    const allTs = series.flatMap((s) => s.points.map((p) => ts(p.date)));
    if (allTs.length === 0) return null;
    const maxT = Math.max(...allTs);
    const cutoff = days === Infinity ? -Infinity : maxT - days * DAY;

    const vis = series
      .filter((s) => !hidden.has(s.id))
      .map((s) => ({
        ...s,
        pts: s.points
          .map((p) => ({ t: ts(p.date), price: p.price, date: p.date }))
          .filter((p) => p.t >= cutoff),
      }))
      .filter((s) => s.pts.length > 0);
    if (vis.length === 0) return null;

    const tsIn = vis.flatMap((s) => s.pts.map((p) => p.t));
    const prices = vis.flatMap((s) => s.pts.map((p) => p.price));
    const minT = Math.min(...tsIn);
    const spanT = Math.max(maxT - minT, 1);
    let lo = Math.min(...prices);
    let hi = Math.max(...prices);
    // Only stretch the axis for a reference line that's actually near the
    // data — a breakeven ten times the plotted range would flatten the series.
    if (reference !== null && reference.value > lo * 0.7 && reference.value < hi * 1.3) {
      lo = Math.min(lo, reference.value);
      hi = Math.max(hi, reference.value);
    }
    const padP = (hi - lo || lo * 0.04 || 1) * 0.08;
    lo -= padP;
    hi += padP;

    const x = (t: number) =>
      maxT === minT
        ? (PAD.l + W - PAD.r) / 2
        : PAD.l + ((t - minT) / spanT) * (W - PAD.l - PAD.r);
    const y = (p: number) => H - PAD.b - ((p - lo) / (hi - lo)) * (H - PAD.t - PAD.b);

    const unionDays = [...new Set(tsIn)].sort((a, b) => a - b);
    const step = Math.max(1, Math.ceil(unionDays.length / 6));
    const xTicks = unionDays.filter((_, i) => i % step === 0);

    return { vis, minT, maxT, lo, hi, x, y, unionDays, xTicks, yTicks: niceTicks(lo, hi) };
  }, [series, hidden, range, reference]);

  const toggle = (id: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (series.length - next.size > 1) next.add(id);
      return next;
    });

  if (series.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center border border-edge bg-panel font-mono text-sm text-mute">
        {emptyLabel}
      </div>
    );
  }

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!model || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * W;
    let nearest = model.unionDays[0];
    for (const d of model.unionDays) {
      if (Math.abs(model.x(d) - sx) < Math.abs(model.x(nearest) - sx)) nearest = d;
    }
    setHover({
      day: nearest,
      px: (model.x(nearest) / W) * rect.width,
      py: e.clientY - rect.top,
    });
  };

  const hoverRows =
    model && hover
      ? model.vis
          .map((s) => {
            const pt = s.pts.find((p) => p.t === hover.day);
            return pt ? { name: s.name, color: s.color, price: pt.price } : null;
          })
          .filter((r): r is NonNullable<typeof r> => r !== null)
          .sort((a, b) => a.price - b.price)
      : [];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        {/* legend — identity by fixed source color, click to isolate */}
        <div className="flex flex-wrap gap-2">
          {series.map((s) => (
            <button
              key={s.id}
              onClick={() => toggle(s.id)}
              aria-pressed={!hidden.has(s.id)}
              className={`flex items-center gap-1.5 border px-2 py-1 font-mono text-xs transition-colors ${
                hidden.has(s.id)
                  ? "border-edge text-mute"
                  : "border-edge2 text-ink2 hover:text-ink"
              }`}
            >
              <span
                aria-hidden
                className="inline-block h-2 w-2"
                style={{ background: hidden.has(s.id) ? "var(--color-mute)" : s.color }}
              />
              {s.name}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              aria-pressed={range === r.key}
              className={`px-2 py-1 font-mono text-xs transition-colors ${
                range === r.key
                  ? "bg-accdim text-acc"
                  : "text-mute hover:text-ink2"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative border border-edge bg-panel">
        {!model ? (
          <div className="flex h-64 items-center justify-center font-mono text-sm text-mute">
            No snapshots in this window.
          </div>
        ) : (
          <>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              className="block w-full"
              role="img"
              aria-label={ariaLabel}
              onMouseMove={onMove}
              onMouseLeave={() => setHover(null)}
            >
              {model.yTicks.map((v) => (
                <g key={v}>
                  <line
                    x1={PAD.l}
                    x2={W - PAD.r}
                    y1={model.y(v)}
                    y2={model.y(v)}
                    stroke="var(--color-grid)"
                    strokeWidth="1"
                  />
                  <text
                    x={PAD.l - 8}
                    y={model.y(v) + 3}
                    textAnchor="end"
                    fontSize="11"
                    fill="var(--color-mute)"
                    fontFamily="var(--font-mono)"
                  >
                    {fmtTick(v)}
                  </text>
                </g>
              ))}
              {model.xTicks.map((t) => (
                <text
                  key={t}
                  x={model.x(t)}
                  y={H - PAD.b + 18}
                  textAnchor="middle"
                  fontSize="11"
                  fill="var(--color-mute)"
                  fontFamily="var(--font-mono)"
                >
                  {shortDate(new Date(t).toISOString().slice(0, 10))}
                </text>
              ))}

              {reference !== null &&
                reference.value > model.lo &&
                reference.value < model.hi && (
                <g>
                  <line
                    x1={PAD.l}
                    x2={W - PAD.r}
                    y1={model.y(reference.value)}
                    y2={model.y(reference.value)}
                    stroke="var(--color-edge2)"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={W - PAD.r}
                    y={model.y(reference.value) - 5}
                    textAnchor="end"
                    fontSize="10"
                    fill="var(--color-mute)"
                    fontFamily="var(--font-mono)"
                  >
                    {reference.label}
                  </text>
                </g>
              )}

              {hover && (
                <line
                  x1={model.x(hover.day)}
                  x2={model.x(hover.day)}
                  y1={PAD.t}
                  y2={H - PAD.b}
                  stroke="var(--color-edge2)"
                  strokeWidth="1"
                />
              )}

              {model.vis.map((s) => (
                <g key={s.id}>
                  {s.pts.length > 1 && (
                    <polyline
                      points={s.pts.map((p) => `${model.x(p.t)},${model.y(p.price)}`).join(" ")}
                      fill="none"
                      stroke={s.color}
                      strokeWidth="2"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  )}
                  {s.pts.map((p) => (
                    <circle
                      key={p.t}
                      cx={model.x(p.t)}
                      cy={model.y(p.price)}
                      r={hover?.day === p.t ? 4 : 2.5}
                      fill={s.color}
                      stroke="var(--color-panel)"
                      strokeWidth="2"
                    />
                  ))}
                </g>
              ))}
            </svg>

            {hover && hoverRows.length > 0 && (
              <div
                className="pointer-events-none absolute z-10 border border-edge2 bg-panel2 px-3 py-2 shadow-lg"
                style={{
                  left: `min(max(${hover.px + 12}px, 8px), calc(100% - 200px))`,
                  top: 12,
                }}
              >
                <p className="mb-1 font-mono text-[11px] text-mute">
                  {shortDate(new Date(hover.day).toISOString().slice(0, 10))}
                </p>
                {hoverRows.map((r) => (
                  <p key={r.name} className="flex items-center gap-2 font-mono text-xs">
                    <span aria-hidden className="inline-block h-2 w-2" style={{ background: r.color }} />
                    <span className="text-ink2">{r.name}</span>
                    <span className="ml-auto pl-4 text-ink">{fmtValue(r.price)}</span>
                  </p>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
