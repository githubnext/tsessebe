/**
 * Benchmark: seriesRadd / seriesRsub / seriesRmul / seriesRdiv — reverse arithmetic on 100k-element Series.
 * Outputs JSON: {"function": "series_radd_rsub", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, seriesRadd, seriesRsub, seriesRmul, seriesRdiv } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => (i % 1000) + 1) });

for (let i = 0; i < WARMUP; i++) {
  seriesRadd(s, 100);
  seriesRsub(s, 100);
  seriesRmul(s, 2);
  seriesRdiv(s, 1000);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  seriesRadd(s, 100);
  seriesRsub(s, 100);
  seriesRmul(s, 2);
  seriesRdiv(s, 1000);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_radd_rsub",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
