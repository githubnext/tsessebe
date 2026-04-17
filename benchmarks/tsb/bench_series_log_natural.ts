/**
 * Benchmark: seriesLog — natural logarithm on a 100k-element Series.
 * Outputs JSON: {"function": "series_log_natural", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, seriesLog } from "../../src/index.ts";

const ROWS = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

// Positive values to avoid NaN in log
const s = new Series({ data: Array.from({ length: ROWS }, (_, i) => (i % 10000) + 1) });

for (let i = 0; i < WARMUP; i++) {
  seriesLog(s);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  seriesLog(s);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_log_natural",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
