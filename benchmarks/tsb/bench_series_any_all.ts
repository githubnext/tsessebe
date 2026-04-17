/**
 * Benchmark: anySeries / allSeries — boolean reductions on 100k-element Series.
 * Outputs JSON: {"function": "series_any_all", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, anySeries, allSeries } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => i % 2 === 0) });

for (let i = 0; i < WARMUP; i++) {
  anySeries(s);
  allSeries(s);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  anySeries(s);
  allSeries(s);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_any_all",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
