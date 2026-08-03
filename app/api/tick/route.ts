import { NextResponse } from "next/server";
import { ensureFresh, isRefreshing } from "@/lib/refresh";
import { readMeta } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Heartbeat the UI polls every 10 seconds. Returns the last-refresh stamp so
 * clients know when to re-render, and lazily kicks off a background sweep
 * whenever the store has gone stale — traffic keeps the prices fresh.
 */
export async function GET() {
  ensureFresh();
  const meta = readMeta();
  return NextResponse.json({
    lastRefresh: meta.lastRefresh,
    refreshing: isRefreshing(),
  });
}
