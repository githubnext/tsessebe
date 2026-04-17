/**
 * Benchmark: TZDatetimeIndex methods — toLocalStrings, sort, unique, filter, contains.
 * Outputs JSON: {"function": "tz_datetime_index_ops", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { date_range, tz_localize } from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

const naive = date_range({ start: "2024-01-01", periods: SIZE, freq: "h" });
const tzIdx = tz_localize(naive, "America/New_York");
const refDate = new Date("2024-06-01T00:00:00Z");

for (let i = 0; i < WARMUP; i++) {
  tzIdx.toLocalStrings();
  tzIdx.sort();
  tzIdx.unique();
  tzIdx.filter((d) => d >= refDate);
  tzIdx.contains(refDate);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  tzIdx.toLocalStrings();
  tzIdx.sort();
  tzIdx.unique();
  tzIdx.filter((d) => d >= refDate);
  tzIdx.contains(refDate);
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "tz_datetime_index_ops",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
