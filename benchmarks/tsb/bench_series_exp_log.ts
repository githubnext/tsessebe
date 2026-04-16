/**
 * Benchmark: seriesExp / seriesLog2 / seriesLog10 / seriesSign — extended math on 100k-element Series.
 * Outputs JSON: {"function": "series_exp_log", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, seriesExp, seriesLog2, seriesLog10, seriesSign } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

// Positive values for log operations
const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => (i % 1000) + 1) });

for (let i = 0; i < WARMUP; i++) {
  seriesExp(s);
  seriesLog2(s);
  seriesLog10(s);
  seriesSign(s);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  seriesExp(s);
  seriesLog2(s);
  seriesLog10(s);
  seriesSign(s);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_exp_log",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
