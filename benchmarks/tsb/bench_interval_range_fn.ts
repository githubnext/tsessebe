/**
 * Benchmark: intervalRange — generate a sequence of equal-length intervals.
 * Mirrors pandas.interval_range().
 * Outputs JSON: {"function": "interval_range_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { intervalRange } from "../../src/index.ts";

const WARMUP = 5;
const ITERATIONS = 100;

for (let i = 0; i < WARMUP; i++) {
  intervalRange(0, 100, { periods: 1000 });
  intervalRange(0, 1, { freq: 0.001 });
  intervalRange(0, 50, { periods: 500, closed: "left" });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  intervalRange(0, 100, { periods: 1000 });
  intervalRange(0, 1, { freq: 0.001 });
  intervalRange(0, 50, { periods: 500, closed: "left" });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "interval_range_fn",
    mean_ms: Math.round((total / ITERATIONS) * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(total * 1000) / 1000,
  }),
);
