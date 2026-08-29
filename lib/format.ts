const usdFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export const usd = (n: number): string => usdFmt.format(n);

/** Signed percent: "-3.1%" / "+0.8%" / "0.0%". */
export const pct = (frac: number): string => {
  const v = frac * 100;
  const sign = v > 0.049 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
};

export const shortDate = (iso: string): string => {
  const [, m, d] = iso.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[m - 1]} ${d}`;
};

/**
 * Hourly rental rate. Rates span four orders of magnitude — a Vast.ai V100 at
 * three cents an hour and an 8-way B200 node at $114 — so precision follows
 * magnitude rather than a fixed two decimals, which would render the cheap end
 * as "$0.03" and throw away the difference between hosts.
 */
export const rate = (n: number): string => {
  if (n >= 100) return `$${n.toFixed(0)}`;
  if (n >= 10) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(3)}`;
};

/** Rate with its unit, for standalone display. */
export const perHour = (n: number): string => `${rate(n)}/hr`;

/**
 * Hours until renting costs more than buying outright. Deliberately ignores
 * power, cooling, networking and the cost of capital — it's a floor on the
 * breakeven, not a TCO model, and the UI says so.
 */
export const breakevenHours = (buyPrice: number, hourlyRate: number): number =>
  hourlyRate > 0 ? buyPrice / hourlyRate : Infinity;

/** "3.2 months" / "11 days" / "1.4 years" — breakeven at human scale. */
export const humanHours = (hours: number): string => {
  if (!Number.isFinite(hours)) return "never";
  const days = hours / 24;
  if (days < 1) return `${Math.round(hours)} hours`;
  if (days < 60) return `${days.toFixed(days < 10 ? 1 : 0)} days`;
  const months = days / 30.44;
  if (months < 24) return `${months.toFixed(1)} months`;
  return `${(days / 365.25).toFixed(1)} years`;
};
