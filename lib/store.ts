import fs from "node:fs";
import path from "node:path";
import type { DayStat, History, ListingBook, StoredDay, StoreMeta } from "./types";

/**
 * File-backed store. Real price history accrues here: every refresh writes
 * one price per (gpu, source) per day into history.json, and the latest
 * matching listings into listings.json. Swap for SQLite/Postgres by
 * reimplementing this module — everything else consumes the same shapes.
 */

const DATA_DIR = path.join(process.cwd(), "data");

const file = (name: string) => path.join(DATA_DIR, name);

function readJson<T>(name: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file(name), "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(file(name), JSON.stringify(value, null, 1));
}

/**
 * Old files stored one bare number per day. Widen those into DayStat on read
 * so a store written by any prior version still loads and charts.
 */
const normalizeDay = (v: StoredDay, day: string): DayStat =>
  typeof v === "number"
    ? { lo: v, hi: v, n: 1, at: `${day}T00:00:00.000Z` }
    : v;

export const readHistory = (): History => {
  const raw = readJson<Record<string, Record<string, Record<string, StoredDay>>>>(
    "history.json",
    {}
  );
  const out: History = {};
  for (const [slug, bySource] of Object.entries(raw)) {
    out[slug] = {};
    for (const [sourceId, days] of Object.entries(bySource)) {
      out[slug][sourceId] = {};
      for (const [day, v] of Object.entries(days)) {
        out[slug][sourceId][day] = normalizeDay(v, day);
      }
    }
  }
  return out;
};
export const readListings = (): ListingBook => readJson("listings.json", {});
export const readMeta = (): StoreMeta =>
  readJson("meta.json", { lastRefresh: null, errors: {} });

export const writeHistory = (h: History): void => writeJson("history.json", h);
export const writeListings = (l: ListingBook): void => writeJson("listings.json", l);
export const writeMeta = (m: StoreMeta): void => writeJson("meta.json", m);

export const todayISO = (): string => new Date().toISOString().slice(0, 10);
