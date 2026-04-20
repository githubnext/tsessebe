/**
 * Benchmark: intervalRange — generate numeric IntervalIndex ranges.
 * Outputs JSON: {"function": "interval_range_na", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { intervalRange } from "../../src/index.ts";

const WARMUP = 5;
const ITERATIONS = 100;

for (let i = 0; i < WARMUP; i++) {
  intervalRange(0, 1000, { periods: 100 });
  intervalRange(0, 1000, { freq: 2 });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  intervalRange(0, 1000, { periods: 100 });
  intervalRange(0, 1000, { freq: 2 });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "interval_range_na",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
