/**
 * Benchmark: TZDatetimeIndex — slice, concat, at, toArray, toTimestamps, min, max,
 *            tz_convert (instance method), tz_localize_none on 10k-element TZDatetimeIndex.
 * Outputs JSON: {"function": "tz_datetime_index_extra", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { date_range, tz_localize } from "../../src/index.js";

const SIZE = 10_000;
const WARMUP = 3;
const ITERATIONS = 20;

const naive = date_range({ start: "2024-01-01", periods: SIZE, freq: "h" });
const tzIdx = tz_localize(naive, "America/New_York");
const halfSize = Math.floor(SIZE / 2);

for (let i = 0; i < WARMUP; i++) {
  tzIdx.slice(0, halfSize);
  const half1 = tzIdx.slice(0, halfSize);
  const half2 = tzIdx.slice(halfSize);
  half1.concat(half2);
  tzIdx.at(0);
  tzIdx.toArray();
  tzIdx.toTimestamps();
  tzIdx.min();
  tzIdx.max();
  tzIdx.tz_convert("UTC");
  tzIdx.tz_localize_none();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  tzIdx.slice(0, halfSize);
  const half1 = tzIdx.slice(0, halfSize);
  const half2 = tzIdx.slice(halfSize);
  half1.concat(half2);
  tzIdx.at(0);
  tzIdx.toArray();
  tzIdx.toTimestamps();
  tzIdx.min();
  tzIdx.max();
  tzIdx.tz_convert("UTC");
  tzIdx.tz_localize_none();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "tz_datetime_index_extra",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
