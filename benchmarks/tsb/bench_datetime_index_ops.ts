/**
 * Benchmark: DatetimeIndex sort / unique / toStrings / slice / contains / concat — DatetimeIndex operations.
 * Outputs JSON: {"function": "datetime_index_ops", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { date_range } from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

const idx = date_range({ start: "2020-01-01", periods: SIZE, freq: "h" });
const idx2 = date_range({ start: "2021-01-01", periods: SIZE, freq: "h" });
const refDate = new Date("2020-06-15T00:00:00Z");

for (let i = 0; i < WARMUP; i++) {
  idx.sort();
  idx.unique();
  idx.toStrings();
  idx.slice(0, 100);
  idx.contains(refDate);
  idx.concat(idx2);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  idx.sort();
  idx.unique();
  idx.toStrings();
  idx.slice(0, 100);
  idx.contains(refDate);
  idx.concat(idx2);
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "datetime_index_ops",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
