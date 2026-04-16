/**
 * Benchmark: seriesFloor / seriesCeil / seriesTrunc / seriesSqrt / seriesLog — math operations.
 * Outputs JSON: {"function": "numeric_ops_math", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import {
  Series,
  seriesFloor,
  seriesCeil,
  seriesTrunc,
  seriesSqrt,
  seriesLog,
} from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

// Positive values for sqrt/log
const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => (i + 1) * 0.1) });

for (let i = 0; i < WARMUP; i++) {
  seriesFloor(s);
  seriesCeil(s);
  seriesTrunc(s);
  seriesSqrt(s);
  seriesLog(s);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  seriesFloor(s);
  seriesCeil(s);
  seriesTrunc(s);
  seriesSqrt(s);
  seriesLog(s);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "numeric_ops_math",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
