import { validate } from "./palette";
import { GPUS } from "../lib/gpus";
import { SOURCES, sourceById } from "../lib/sources";

/**
 * Chart series must separate hardest — lines overlap on one surface. Link-only
 * sources never chart, so they're checked only as swatches.
 */
const chartable = SOURCES.filter((s) => s.mode !== "link");
const palette = (ids: string[]) =>
  Object.fromEntries(ids.map((id) => [id, sourceById(id).color]));

validate("chartable", palette(chartable.map((s) => s.id)));

const byCategory: Record<string, Set<string>> = {};
for (const g of GPUS) {
  byCategory[g.category] ??= new Set();
  for (const id of g.sources) {
    if (sourceById(id).mode !== "link") byCategory[g.category].add(id);
  }
}
for (const [cat, ids] of Object.entries(byCategory)) {
  validate(`chart: ${cat}`, palette([...ids]));
}

validate("all swatches", palette(SOURCES.map((s) => s.id)));
