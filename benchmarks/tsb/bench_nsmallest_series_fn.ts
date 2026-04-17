/**
 * Benchmark: nsmallestSeries — standalone nsmallest on 100k-element Series.
 * Outputs JSON: {"function": "nsmallest_series_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, nsmallestSeries } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => Math.sin(i * 0.01) * 1000) });

for (let i = 0; i < WARMUP; i++) {
  nsmallestSeries(s, 100);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  nsmallestSeries(s, 100);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "nsmallest_series_fn",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
