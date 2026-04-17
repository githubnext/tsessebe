/**
 * Benchmark: seriesEq / seriesNe / seriesLt / seriesGt / seriesLe / seriesGe — standalone comparison functions on 100k Series.
 * Outputs JSON: {"function": "series_standalone_compare", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, seriesEq, seriesNe, seriesLt, seriesGt, seriesLe, seriesGe } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => i * 0.1) });
const threshold = SIZE * 0.05;

for (let i = 0; i < WARMUP; i++) {
  seriesEq(s, threshold);
  seriesNe(s, threshold);
  seriesLt(s, threshold);
  seriesGt(s, threshold);
  seriesLe(s, threshold);
  seriesGe(s, threshold);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  seriesEq(s, threshold);
  seriesNe(s, threshold);
  seriesLt(s, threshold);
  seriesGt(s, threshold);
  seriesLe(s, threshold);
  seriesGe(s, threshold);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_standalone_compare",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
