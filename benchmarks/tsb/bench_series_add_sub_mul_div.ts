/**
 * Benchmark: seriesAdd / seriesSub / seriesMul / seriesDiv — standalone arithmetic functions.
 * Outputs JSON: {"function": "series_add_sub_mul_div", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, seriesAdd, seriesSub, seriesMul, seriesDiv } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const a = new Series({ data: Array.from({ length: SIZE }, (_, i) => i * 1.5) });
const b = new Series({ data: Array.from({ length: SIZE }, (_, i) => (i % 1000) + 1) });

for (let i = 0; i < WARMUP; i++) {
  seriesAdd(a, b);
  seriesSub(a, b);
  seriesMul(a, 2);
  seriesDiv(a, b);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  seriesAdd(a, b);
  seriesSub(a, b);
  seriesMul(a, 2);
  seriesDiv(a, b);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_add_sub_mul_div",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
