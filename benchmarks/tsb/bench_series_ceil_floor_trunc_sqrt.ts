/**
 * Benchmark: seriesCeil / seriesFloor / seriesTrunc / seriesSqrt — math rounding on 100k-element Series.
 * Outputs JSON: {"function": "series_ceil_floor_trunc_sqrt", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, seriesCeil, seriesFloor, seriesTrunc, seriesSqrt } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => (i % 1000) * 0.7 + 0.3) });

for (let i = 0; i < WARMUP; i++) {
  seriesCeil(s);
  seriesFloor(s);
  seriesTrunc(s);
  seriesSqrt(s);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  seriesCeil(s);
  seriesFloor(s);
  seriesTrunc(s);
  seriesSqrt(s);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_ceil_floor_trunc_sqrt",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
