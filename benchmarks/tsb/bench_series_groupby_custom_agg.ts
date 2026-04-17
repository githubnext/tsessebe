/**
 * Benchmark: SeriesGroupBy.agg with custom aggregate function — median, geometric mean, range.
 * Mirrors pandas SeriesGroupBy.agg(custom_fn) for custom reductions.
 * Outputs JSON: {"function": "series_groupby_custom_agg", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

const data = Array.from({ length: SIZE }, (_, i) => (i * 1.5) % 9999);
const by = Array.from({ length: SIZE }, (_, i) => i % 100);
const s = new Series({ data });
const byS = new Series({ data: by });
const gb = s.groupby(byS);

// Custom aggregation functions
function medianFn(vals: readonly (string | number | boolean | null | undefined)[]): number {
  const nums = vals.filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
  if (nums.length === 0) return Number.NaN;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2 : (sorted[mid] ?? Number.NaN);
}

function rangeFn(vals: readonly (string | number | boolean | null | undefined)[]): number {
  const nums = vals.filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
  if (nums.length === 0) return Number.NaN;
  return Math.max(...nums) - Math.min(...nums);
}

for (let i = 0; i < WARMUP; i++) {
  gb.agg(medianFn);
  gb.agg(rangeFn);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  gb.agg(medianFn);
  gb.agg(rangeFn);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_groupby_custom_agg",
    mean_ms: Math.round((total / ITERATIONS) * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(total * 1000) / 1000,
  }),
);
