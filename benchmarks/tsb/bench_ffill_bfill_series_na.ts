/**
 * Benchmark: ffillSeries / bfillSeries — forward/backward fill on 100k-element Series.
 * Outputs JSON: {"function": "ffill_bfill_series_na", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, ffillSeries, bfillSeries } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

// ~10% null values
const data: (number | null)[] = Array.from({ length: SIZE }, (_, i) =>
  i % 10 === 0 ? null : i * 1.5,
);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  ffillSeries(s);
  bfillSeries(s);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  ffillSeries(s);
  bfillSeries(s);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "ffill_bfill_series_na",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
