import { NextResponse } from "next/server";
import { refreshAll } from "@/lib/refresh";
import { refreshRentals } from "@/lib/rentals/refresh";

export const dynamic = "force-dynamic";

/**
 * Force a sweep of both markets. `?market=retail` or `?market=rentals` limits
 * it to one — useful when only one side's adapters have changed.
 */
export async function POST(request: Request) {
  const market = new URL(request.url).searchParams.get("market");

  const [retail, rentals] = await Promise.all([
    market === "rentals" ? null : refreshAll(),
    market === "retail" ? null : refreshRentals(),
  ]);

  return NextResponse.json({ retail, rentals });
}

export const GET = POST;
