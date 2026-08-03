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
