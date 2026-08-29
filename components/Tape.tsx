import Link from "next/link";
import { pct, rate, usd } from "@/lib/format";
import { getAllQuotes } from "@/lib/quotes";
import { getAllRentalQuotes } from "@/lib/rentals/quotes";

/** Green when the price fell, red when it rose, muted when it barely moved. */
const moveClass = (d: number | null): string =>
  d === null || Math.abs(d) < 0.0005
    ? "text-mute"
    : d < 0
      ? "text-acc"
      : "text-neg";

const ITEM_CLASS =
  "flex items-baseline gap-2 px-5 py-1.5 font-mono text-xs whitespace-nowrap hover:bg-panel2";

/**
 * The signature: a slow market tape of every tracked part, buy price first and
 * then the hourly rental rate for the same silicon — the two halves of the
 * board scrolling past each other.
 */
export default function Tape() {
  const buys = getAllQuotes().filter(({ quote }) => quote.best !== null);
  const rents = getAllRentalQuotes().filter(({ quote }) => quote.best !== null);
  if (buys.length === 0 && rents.length === 0) return null;

  const items = [
    ...buys.map(({ gpu, quote }) => (
      <Link key={`buy-${gpu.slug}`} href={`/gpu/${gpu.slug}`} className={ITEM_CLASS}>
        <span className="text-ink2">{gpu.ticker}</span>
        <span className="text-ink">{usd(quote.best!)}</span>
        {quote.delta24h !== null && (
          <span className={moveClass(quote.delta24h)}>{pct(quote.delta24h)}</span>
        )}
      </Link>
    )),
    ...rents.map(({ model, quote }) => (
      <Link
        key={`rent-${model.slug}`}
        href={`/rent/${model.slug}`}
        className={ITEM_CLASS}
      >
        <span className="text-ink2">{model.ticker}</span>
        <span className="text-ink">
          {rate(quote.best!)}
          <span className="text-mute">/hr</span>
        </span>
        {quote.delta24h !== null && (
          <span className={moveClass(quote.delta24h)}>{pct(quote.delta24h)}</span>
        )}
      </Link>
    )),
  ];

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
