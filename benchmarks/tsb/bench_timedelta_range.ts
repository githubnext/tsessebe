/**
 * Benchmark: timedelta_range — evenly-spaced TimedeltaIndex factory.
 * Outputs JSON: {"function": "timedelta_range", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { timedelta_range } from "../../src/index.js";

const SIZE = 1_000;
const WARMUP = 5;
const ITERATIONS = 200;

// Warm-up: three usage patterns
for (let i = 0; i < WARMUP; i++) {
  // start + periods + freq
  timedelta_range({ start: "0 days", periods: SIZE, freq: "H" });
  // start + end + freq
  timedelta_range({ start: "0 days", end: `${SIZE} days`, freq: "D" });
  // start + end + periods (linspace)
  timedelta_range({ start: "0 days", end: "10 days", periods: SIZE });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  timedelta_range({ start: "0 days", periods: SIZE, freq: "H" });
  timedelta_range({ start: "0 days", end: `${SIZE} days`, freq: "D" });
  timedelta_range({ start: "0 days", end: "10 days", periods: SIZE });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "timedelta_range",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
