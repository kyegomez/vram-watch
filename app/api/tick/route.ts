import { NextResponse } from "next/server";
import { ensureFresh, isRefreshing } from "@/lib/refresh";
import {
  ensureRentalsFresh,
  isRefreshingRentals,
} from "@/lib/rentals/refresh";
import { readMeta, readRentalMeta } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Heartbeat the UI polls every 10 seconds. Returns the last-refresh stamp for
 * both markets so clients know when to re-render, and lazily kicks off a
 * background sweep of whichever has gone stale — traffic keeps prices current
 * without any cron. The two sweeps are independent: a retail source timing out
 * never delays the rental board, or the reverse.
 */
export async function GET() {
  ensureFresh();
  ensureRentalsFresh();

  return NextResponse.json({
    lastRefresh: readMeta().lastRefresh,
    refreshing: isRefreshing(),
    rentals: {
      lastRefresh: readRentalMeta().lastRefresh,
      refreshing: isRefreshingRentals(),
    },
  });
}
