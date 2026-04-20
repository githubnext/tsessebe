/**
 * Benchmark: series_reflected_arith — seriesRadd / seriesRsub / seriesRmul / seriesRdiv.
 * Outputs JSON: {"function": "series_reflected_arith", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, seriesRadd, seriesRsub, seriesRmul, seriesRdiv } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const a = new Series({ data: Array.from({ length: SIZE }, (_, i) => i * 1.5) });
const b = new Series({ data: Array.from({ length: SIZE }, (_, i) => (i % 1000) + 1) });

for (let i = 0; i < WARMUP; i++) {
  seriesRadd(a, 10);
  seriesRsub(a, 1000);
  seriesRmul(a, 3);
  seriesRdiv(b, 100);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  seriesRadd(a, 10);
  seriesRsub(a, 1000);
  seriesRmul(a, 3);
  seriesRdiv(b, 100);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_reflected_arith",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
