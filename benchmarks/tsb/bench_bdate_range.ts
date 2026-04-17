/**
 * Benchmark: bdate_range — generate business-day DatetimeIndex with 1000 periods.
 * Outputs JSON: {"function": "bdate_range", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { bdate_range } from "../../src/index.ts";

const WARMUP = 5;
const ITERATIONS = 100;

for (let i = 0; i < WARMUP; i++) {
  bdate_range({ start: "2020-01-01", periods: 1000 });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  bdate_range({ start: "2020-01-01", periods: 1000 });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "bdate_range",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
