"use client";

import { useId } from "react";
import type { PricePoint } from "@/lib/types";

/**
 * Card-sized price chart: the cross-source best price, drawn as a line with a
 * soft area fill. Green when the price is trending down (a deal forming),
 * warm when it's climbing. Purely presentational — the GPU page has the full
 * interactive chart.
 */
export default function CardChart({ points }: { points: PricePoint[] }) {
  const gradId = useId();
  const w = 280;
  const h = 72;

  if (points.length === 0) {
    return (
      <div className="flex h-[72px] items-center justify-center border border-dashed border-edge font-mono text-[11px] text-mute">
        no snapshots yet
      </div>
    );
  }

  const prices = points.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const x = (i: number) =>
    points.length === 1 ? w / 2 : (i / (points.length - 1)) * (w - 8) + 4;
  const y = (p: number) => h - 6 - ((p - min) / span) * (h - 16);

  const first = prices[0];
  const last = prices[prices.length - 1];
  const color =
    Math.abs(last - first) / first < 0.002
      ? "var(--color-ink2)"
      : last < first
        ? "var(--color-acc)"
        : "var(--color-neg)";

  const line = points.map((p, i) => `${x(i)},${y(p.price)}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="h-[72px] w-full"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {points.length > 1 && (
        <>
          <polygon
            points={`${x(0)},${h} ${line} ${x(points.length - 1)},${h}`}
            fill={`url(#${gradId})`}
          />
          <polyline
            points={line}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </>
      )}
      <circle
        cx={x(points.length - 1)}
        cy={y(last)}
        r="3"
        fill={color}
        stroke="var(--color-panel)"
        strokeWidth="1.5"
      />
    </svg>
  );
}
