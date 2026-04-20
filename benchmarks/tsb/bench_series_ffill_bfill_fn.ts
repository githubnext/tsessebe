/**
 * Benchmark: ffillSeries / bfillSeries — standalone forward/backward fill on 100k-element Series.
 * Mirrors pandas Series.ffill() / Series.bfill().
 * Outputs JSON: {"function": "series_ffill_bfill_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, ffillSeries, bfillSeries } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

// ~20% NaN values scattered
const s = new Series({
  data: Array.from({ length: SIZE }, (_, i) => (i % 5 === 0 ? null : i * 1.0)),
});

for (let i = 0; i < WARMUP; i++) {
  ffillSeries(s);
  bfillSeries(s);
  ffillSeries(s, { limit: 2 });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  ffillSeries(s);
  bfillSeries(s);
  ffillSeries(s, { limit: 2 });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_ffill_bfill_fn",
    mean_ms: Math.round((total / ITERATIONS) * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(total * 1000) / 1000,
  }),
);
