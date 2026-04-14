/**
 * Benchmark: DataFrameGroupBy.agg with custom median function on 100k-row DataFrame.
 */
import { DataFrame } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const df = DataFrame.fromColumns({
  group: Array.from({ length: ROWS }, (_, i) => i % 100),
  value: Array.from({ length: ROWS }, (_, i) => (i * 1.414) % 9999),
});

function median(vals: readonly (number | string | boolean | null | undefined)[]): number {
  const nums = vals.filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
  if (nums.length === 0) return Number.NaN;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

for (let i = 0; i < WARMUP; i++) df.groupby("group").agg({ value: median });

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  df.groupby("group").agg({ value: median });
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ function: "groupby_median", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
