/**
 * Rental chart palette.
 *
 * The retail side gives every source a fixed color it keeps on every chart —
 * with nine chartable sources that's possible, and identity is worth more than
 * anything else. The rental side has twenty-three providers and counting, and
 * no palette of that size stays separable for colorblind viewers: past roughly
 * ten categorical colors, some pair always collides under protanopia.
 *
 * So rental series are colored by *rank within the chart* — cheapest provider
 * first — drawing from the same nine hues the retail palette was validated at
 * (min ΔE 25.1 across normal, protan, deutan and tritan vision). A chart never
 * shows more than nine series, the legend is always visible, and the cheapest
 * provider is always the same color, which is the comparison that matters on
 * a rental chart.
 *
 * Rank 1 is a green near the brand accent but not the accent itself: the exact
 * accent (#3ecf8e) collides with the cyan at rank 2 under tritanopia (ΔE 19.3),
 * while this green clears every pair at 25.1.
 *
 * `pnpm palette` validates this set alongside the retail one.
 */
export const RENT_PALETTE = [
  "#48bc83", // rank 1 — the market low
  "#0cffff",
  "#ffc702",
  "#ff4054",
  "#aa57bc",
  "#cf8601",
  "#4251f5",
  "#b9fcd0",
  "#f2f296",
] as const;

/** How many providers a single rental chart will draw. */
export const MAX_CHART_SERIES = RENT_PALETTE.length;

export const rentColor = (rank: number): string =>
  RENT_PALETTE[rank % RENT_PALETTE.length];
