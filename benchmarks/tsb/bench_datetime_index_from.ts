/**
 * Benchmark: DatetimeIndex.fromDates / DatetimeIndex.fromTimestamps — DatetimeIndex construction from raw data.
 * Outputs JSON: {"function": "datetime_index_from", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DatetimeIndex } from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

const BASE = Date.UTC(2000, 0, 1);
const DAY_MS = 86_400_000;

const dates = Array.from({ length: SIZE }, (_, i) => new Date(BASE + i * DAY_MS));
const timestamps = Array.from({ length: SIZE }, (_, i) => BASE + i * DAY_MS);

for (let i = 0; i < WARMUP; i++) {
  DatetimeIndex.fromDates(dates);
  DatetimeIndex.fromTimestamps(timestamps);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  DatetimeIndex.fromDates(dates);
  DatetimeIndex.fromTimestamps(timestamps);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "datetime_index_from",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
