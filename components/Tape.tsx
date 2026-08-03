import Link from "next/link";
import { usd, pct } from "@/lib/format";
import { getAllQuotes } from "@/lib/quotes";

/** The signature: a slow market tape of every tracked part. */
export default function Tape() {
  const rows = getAllQuotes().filter(({ quote }) => quote.best !== null);
  if (rows.length === 0) return null;

  const items = rows.map(({ gpu, quote }) => {
    const d = quote.delta24h;
    const cls =
      d === null || Math.abs(d) < 0.0005
        ? "text-mute"
        : d < 0
          ? "text-acc"
          : "text-neg";
    return (
      <Link
        key={gpu.slug}
        href={`/gpu/${gpu.slug}`}
        className="flex items-baseline gap-2 px-5 py-1.5 font-mono text-xs whitespace-nowrap hover:bg-panel2"
      >
        <span className="text-ink2">{gpu.ticker}</span>
        <span className="text-ink">{usd(quote.best!)}</span>
        {d !== null && <span className={cls}>{pct(d)}</span>}
      </Link>
    );
  });

  return (
    <div className="tape overflow-hidden border-b border-edge bg-panel">
      <div className="tape-track">
        <div className="flex">{items}</div>
        <div className="flex" aria-hidden>
          {items}
        </div>
      </div>
    </div>
  );
}
