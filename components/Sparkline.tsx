import type { PricePoint } from "@/lib/types";

/** 30-day best-price sparkline. Green when trending down (cheaper). */
export default function Sparkline({ points }: { points: PricePoint[] }) {
  const w = 96;
  const h = 26;

  if (points.length === 0) {
    return <span className="font-mono text-xs text-mute">no data</span>;
  }

  const prices = points.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const x = (i: number) =>
    points.length === 1 ? w / 2 : (i / (points.length - 1)) * (w - 4) + 2;
  const y = (p: number) => h - 3 - ((p - min) / span) * (h - 6);

  const first = prices[0];
  const last = prices[prices.length - 1];
  const color =
    Math.abs(last - first) / first < 0.002
      ? "var(--color-ink2)"
      : last < first
        ? "var(--color-acc)"
        : "var(--color-neg)";

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden
      className="shrink-0"
    >
      {points.length > 1 && (
        <polyline
          points={points.map((p, i) => `${x(i)},${y(p.price)}`).join(" ")}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      <circle
        cx={x(points.length - 1)}
        cy={y(last)}
        r="2"
        fill={color}
        stroke="var(--color-panel)"
        strokeWidth="1"
      />
    </svg>
  );
}
