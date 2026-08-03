import { NextResponse } from "next/server";
import { refreshAll } from "@/lib/refresh";

export const dynamic = "force-dynamic";

export async function POST() {
  const result = await refreshAll();
  return NextResponse.json(result);
}

export const GET = POST;
