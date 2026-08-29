"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CardChart from "./CardChart";
import Delta from "./Delta";
import Sparkline from "./Sparkline";
import { perHour, rate } from "@/lib/format";
import type { PricePoint } from "@/lib/types";

export interface RentRow {
  slug: string;
  ticker: string;
  name: string;
  tier: string;
  vram: string;
  /** Cheapest per-GPU hourly rate across every provider. */
  best: number | null;
  bestProviderName: string | null;
  /** False when nothing is bookable and the rate shown is a sold-out quote. */
  bestAvailable: boolean;
  /** Dearest per-GPU rate quoted today — the spread worth shopping. */
  spreadHigh: number | null;
  /** Cheapest multi-GPU node per hour, and how many GPUs it carries. */
  clusterHour: number | null;
  clusterGpus: number | null;
  clusterProviderName: string | null;
  delta24h: number | null;
  delta7d: number | null;
  spark: PricePoint[];
  providerCount: number;
}

const TABS = [
  { key: "all", label: "All" },
  { key: "frontier", label: "Frontier AI" },
  { key: "datacenter", label: "Datacenter" },
  { key: "workstation", label: "Workstation & consumer" },
];

type View = "gallery" | "table";
const VIEW_KEY = "vramwatch-rent-view";

/** How many times dearer the priciest provider is than the cheapest. */
const spreadX = (r: RentRow): string | null =>
  r.best !== null && r.spreadHigh !== null && r.best > 0
    ? `${(r.spreadHigh / r.best).toFixed(1)}×`
    : null;

export default function RentBoard({ rows }: { rows: RentRow[] }) {
  const [tab, setTab] = useState("all");
  const [view, setView] = useState<View>("gallery");

  useEffect(() => {
    const saved = localStorage.getItem(VIEW_KEY);
    if (saved === "table" || saved === "gallery") setView(saved);
  }, []);

  const pickView = (v: View) => {
    setView(v);
    localStorage.setItem(VIEW_KEY, v);
  };

  const visible = rows.filter((r) => tab === "all" || r.tier === tab);

  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4 border-b border-edge">
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              aria-pressed={tab === t.key}
              className={`-mb-px border-b-2 px-3 py-2 text-sm transition-colors ${
                tab === t.key
                  ? "border-acc text-ink"
                  : "border-transparent text-mute hover:text-ink2"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mb-2 flex gap-1" role="group" aria-label="View">
          {(
            [
              ["gallery", GalleryIcon, "Gallery view"],
              ["table", TableIcon, "Table view"],
            ] as const
          ).map(([key, Icon, label]) => (
            <button
              key={key}
              onClick={() => pickView(key)}
              aria-pressed={view === key}
              aria-label={label}
              title={label}
              className={`p-1.5 transition-colors ${
                view === key ? "bg-accdim text-acc" : "text-mute hover:text-ink2"
              }`}
            >
              <Icon />
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="py-8 text-center font-mono text-sm text-mute">
          Nothing in this segment yet.
        </p>
      ) : view === "gallery" ? (
        <Gallery rows={visible} />
      ) : (
        <Table rows={visible} />
      )}
    </section>
  );
}

function Gallery({ rows }: { rows: RentRow[] }) {
  return (
    <div className="grid gap-px border border-edge bg-edge sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((r) => (
        <Link
          key={r.slug}
          href={`/rent/${r.slug}`}
          className="group flex flex-col gap-3 bg-panel px-5 py-4 transition-colors hover:bg-panel2"
        >
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-mono text-xs text-acc">{r.ticker}</span>
            <Delta
              value={r.delta24h}
              title="vs. previous snapshot ≥1 day back"
            />
          </div>
          <p className="text-sm text-ink">
            {r.name}
            <span className="ml-2 font-mono text-xs text-mute">{r.vram}</span>
          </p>
          <CardChart points={r.spark} />
          <div className="flex items-baseline justify-between gap-3">
            {r.best !== null ? (
              <>
                <span className="font-mono text-xl text-ink tabular-nums">
                  {rate(r.best)}
                  <span className="text-sm text-mute">/GPU-hr</span>
                </span>
                {r.bestProviderName && (
                  <span className="font-mono text-[11px] text-mute">
                    {r.bestAvailable ? "at" : "sold out at"} {r.bestProviderName}
                  </span>
                )}
              </>
            ) : (
              <span className="font-mono text-sm text-mute">no quotes yet</span>
            )}
          </div>
          {r.clusterHour !== null && (
            <p className="border-t border-edge pt-2 font-mono text-[11px] text-mute">
              {r.clusterGpus}× node from{" "}
              <span className="text-ink2">{perHour(r.clusterHour)}</span>
              {r.clusterProviderName && ` at ${r.clusterProviderName}`}
            </p>
          )}
        </Link>
      ))}
    </div>
  );
}

function Table({ rows }: { rows: RentRow[] }) {
  const router = useRouter();
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] border-collapse">
        <thead>
          <tr className="border-b border-edge text-left font-mono text-[11px] tracking-wider text-mute uppercase">
            <th className="py-2 pr-4 font-normal">Ticker</th>
            <th className="py-2 pr-4 font-normal">GPU</th>
            <th className="py-2 pr-4 text-right font-normal">Best $/GPU-hr</th>
            <th className="py-2 pr-4 text-right font-normal">Spread</th>
            <th className="py-2 pr-4 text-right font-normal">Cheapest node</th>
            <th className="py-2 pr-4 text-right font-normal">24h</th>
            <th className="py-2 pr-4 font-normal">30d trend</th>
            <th className="py-2 text-right font-normal">Providers</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.slug}
              onClick={() => router.push(`/rent/${r.slug}`)}
              className="cursor-pointer border-b border-edge transition-colors hover:bg-panel"
            >
              <td className="py-3 pr-4">
                <Link
                  href={`/rent/${r.slug}`}
                  className="font-mono text-sm text-acc"
                  onClick={(e) => e.stopPropagation()}
                >
                  {r.ticker}
                </Link>
              </td>
              <td className="py-3 pr-4">
                <span className="text-sm text-ink">{r.name}</span>
                <span className="ml-2 hidden font-mono text-xs text-mute sm:inline">
                  {r.vram}
                </span>
              </td>
              <td className="py-3 pr-4 text-right">
                {r.best !== null ? (
                  <>
                    <span className="font-mono text-sm text-ink tabular-nums">
                      {rate(r.best)}
                    </span>
                    {r.bestProviderName && (
                      <span
                        className="ml-2 hidden font-mono text-[11px] text-mute md:inline"
                        title={
                          r.bestAvailable
                            ? undefined
                            : "No provider currently has capacity at this rate"
                        }
                      >
                        {r.bestProviderName}
                        {!r.bestAvailable && " · sold out"}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="font-mono text-xs text-mute">no quotes</span>
                )}
              </td>
              <td
                className="py-3 pr-4 text-right font-mono text-xs text-ink2 tabular-nums"
                title="How many times dearer the priciest provider is than the cheapest"
              >
                {spreadX(r) ?? "—"}
              </td>
              <td className="py-3 pr-4 text-right font-mono text-xs text-ink2 tabular-nums">
                {r.clusterHour !== null ? (
                  <>
                    {perHour(r.clusterHour)}
                    <span className="ml-1 text-mute">/{r.clusterGpus}×</span>
                  </>
                ) : (
                  "—"
                )}
              </td>
              <td className="py-3 pr-4 text-right">
                <Delta value={r.delta24h} title="vs. previous snapshot ≥1 day back" />
              </td>
              <td className="py-3 pr-4">
                <Sparkline points={r.spark} />
              </td>
              <td className="py-3 text-right font-mono text-sm text-ink2 tabular-nums">
                {r.providerCount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GalleryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="1.5" y="1.5" width="5.5" height="5.5" fill="currentColor" />
      <rect x="9" y="1.5" width="5.5" height="5.5" fill="currentColor" />
      <rect x="1.5" y="9" width="5.5" height="5.5" fill="currentColor" />
      <rect x="9" y="9" width="5.5" height="5.5" fill="currentColor" />
    </svg>
  );
}

function TableIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="1.5" y="2" width="13" height="2.5" fill="currentColor" />
      <rect x="1.5" y="6.75" width="13" height="2.5" fill="currentColor" />
      <rect x="1.5" y="11.5" width="13" height="2.5" fill="currentColor" />
    </svg>
  );
}
