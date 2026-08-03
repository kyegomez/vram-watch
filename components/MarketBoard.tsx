"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CardChart from "./CardChart";
import Delta from "./Delta";
import Sparkline from "./Sparkline";
import { usd } from "@/lib/format";
import type { PricePoint } from "@/lib/types";

export interface BoardRow {
  slug: string;
  ticker: string;
  name: string;
  category: string;
  vram: string;
  best: number | null;
  bestSourceName: string | null;
  delta24h: number | null;
  delta7d: number | null;
  spark: PricePoint[];
  liveSources: number;
}

const TABS = [
  { key: "all", label: "All" },
  { key: "consumer", label: "Consumer" },
  { key: "workstation", label: "Workstation" },
  { key: "datacenter", label: "Datacenter AI" },
];

type View = "gallery" | "table";
const VIEW_KEY = "vramwatch-view";

export default function MarketBoard({ rows }: { rows: BoardRow[] }) {
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

  const visible = rows.filter((r) => tab === "all" || r.category === tab);

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
                view === key
                  ? "bg-accdim text-acc"
                  : "text-mute hover:text-ink2"
              }`}
            >
              <Icon />
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="py-8 text-center font-mono text-sm text-mute">
          Nothing in this category yet.
        </p>
      ) : view === "gallery" ? (
        <Gallery rows={visible} />
      ) : (
        <Table rows={visible} />
      )}
    </section>
  );
}

function Gallery({ rows }: { rows: BoardRow[] }) {
  return (
    <div className="grid gap-px border border-edge bg-edge sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((r) => (
        <Link
          key={r.slug}
          href={`/gpu/${r.slug}`}
          className="group flex flex-col gap-3 bg-panel px-5 py-4 transition-colors hover:bg-panel2"
        >
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-mono text-xs text-acc">{r.ticker}</span>
            <Delta value={r.delta24h} title="vs. previous snapshot ≥1 day back" />
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
                  {usd(r.best)}
                </span>
                {r.bestSourceName && (
                  <span className="font-mono text-[11px] text-mute">
                    at {r.bestSourceName}
                  </span>
                )}
              </>
            ) : (
              <span className="font-mono text-sm text-mute">no data yet</span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

function Table({ rows }: { rows: BoardRow[] }) {
  const router = useRouter();
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse">
        <thead>
          <tr className="border-b border-edge text-left font-mono text-[11px] tracking-wider text-mute uppercase">
            <th className="py-2 pr-4 font-normal">Ticker</th>
            <th className="py-2 pr-4 font-normal">Part</th>
            <th className="py-2 pr-4 text-right font-normal">Best price</th>
            <th className="py-2 pr-4 text-right font-normal">24h</th>
            <th className="py-2 pr-4 text-right font-normal">7d</th>
            <th className="py-2 pr-4 font-normal">30d trend</th>
            <th className="py-2 text-right font-normal">Sources</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.slug}
              onClick={() => router.push(`/gpu/${r.slug}`)}
              className="cursor-pointer border-b border-edge transition-colors hover:bg-panel"
            >
              <td className="py-3 pr-4">
                <Link
                  href={`/gpu/${r.slug}`}
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
                      {usd(r.best)}
                    </span>
                    {r.bestSourceName && (
                      <span className="ml-2 hidden font-mono text-[11px] text-mute md:inline">
                        {r.bestSourceName}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="font-mono text-xs text-mute">no data</span>
                )}
              </td>
              <td className="py-3 pr-4 text-right">
                <Delta value={r.delta24h} title="vs. previous snapshot ≥1 day back" />
              </td>
              <td className="py-3 pr-4 text-right">
                <Delta value={r.delta7d} title="vs. snapshot ≥7 days back" />
              </td>
              <td className="py-3 pr-4">
                <Sparkline points={r.spark} />
              </td>
              <td className="py-3 text-right font-mono text-sm text-ink2 tabular-nums">
                {r.liveSources}
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
