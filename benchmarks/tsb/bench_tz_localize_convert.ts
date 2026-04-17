/**
 * Benchmark: tz_localize / tz_convert — timezone operations on 10k-element DatetimeIndex.
 * Outputs JSON: {"function": "tz_localize_convert", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { date_range, tz_localize, tz_convert } from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

const naive = date_range({ start: "2024-01-01", periods: SIZE, freq: "h" });

for (let i = 0; i < WARMUP; i++) {
  const utc = tz_localize(naive, "UTC");
  tz_convert(utc, "America/New_York");
  tz_localize(naive, "America/New_York");
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  const utc = tz_localize(naive, "UTC");
  tz_convert(utc, "America/New_York");
  tz_localize(naive, "America/New_York");
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "tz_localize_convert",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
