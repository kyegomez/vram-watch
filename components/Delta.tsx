import { pct } from "@/lib/format";

/**
 * Price-change badge. On a buyer's board, a falling price is the good news:
 * down wears the green, up wears the warm negative. Arrows carry the sign so
 * color is never the only channel.
 */
export default function Delta({
  value,
  title,
}: {
  value: number | null;
  title?: string;
}) {
  if (value === null) {
    return (
      <span className="font-mono text-xs text-mute" title="not enough history yet">
        —
      </span>
    );
  }
  const flat = Math.abs(value) < 0.0005;
  const cls = flat ? "text-ink2" : value < 0 ? "text-acc" : "text-neg";
  const arrow = flat ? "·" : value < 0 ? "▼" : "▲";
  return (
    <span className={`font-mono text-xs ${cls}`} title={title}>
      {arrow} {pct(value)}
    </span>
  );
}
