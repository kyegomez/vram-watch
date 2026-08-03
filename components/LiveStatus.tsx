"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const POLL_MS = 10_000;

function ago(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/**
 * Production heartbeat: polls the tick endpoint every 10 seconds — the server
 * re-sweeps sources whenever data is stale, and the moment new prices land
 * the page re-renders itself.
 */
export default function LiveStatus({
  lastRefresh,
}: {
  lastRefresh: string | null;
}) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [, forceTick] = useState(0);
  const seen = useRef(lastRefresh);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      try {
        const res = await fetch("/api/tick", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          lastRefresh: string | null;
          refreshing: boolean;
        };
        setRefreshing(data.refreshing);
        if (data.lastRefresh && data.lastRefresh !== seen.current) {
          seen.current = data.lastRefresh;
          router.refresh();
        }
        forceTick((n) => n + 1); // keep the "ago" label current
      } catch {
        // transient network blip — next poll will catch up
      }
    };

    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [router]);

  return (
    <p className="flex items-center gap-2 font-mono text-xs text-mute">
      <span className="relative flex h-2 w-2" aria-hidden>
        <span
          className={`absolute inline-flex h-full w-full rounded-full bg-acc opacity-60 ${
            refreshing ? "animate-ping motion-reduce:animate-none" : ""
          }`}
        />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-acc" />
      </span>
      {refreshing
        ? "updating prices…"
        : seen.current
          ? `live · updated ${ago(seen.current)}`
          : "live · first sweep starting"}
    </p>
  );
}
