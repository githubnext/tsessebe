/**
 * Benchmark: sampleSeries with frac option and sampleDataFrame with frac option.
 * Fractional sampling (10% of 100k elements) with and without replacement.
 * Outputs JSON: {"function": "sample_frac", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, sampleSeries, sampleDataFrame } from "../../src/index.ts";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

const data = Array.from({ length: ROWS }, (_, i) => i * 1.5);
const s = new Series({ data });

const df = DataFrame.fromColumns({
  a: Array.from({ length: ROWS }, (_, i) => i * 1.0),
  b: Array.from({ length: ROWS }, (_, i) => i * 2.0),
  c: Array.from({ length: ROWS }, (_, i) => i * 3.0),
});

for (let i = 0; i < WARMUP; i++) {
  sampleSeries(s, { frac: 0.1 });
  sampleSeries(s, { frac: 0.05, replace: true });
  sampleDataFrame(df, { frac: 0.1 });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  sampleSeries(s, { frac: 0.1 });
  sampleSeries(s, { frac: 0.05, replace: true });
  sampleDataFrame(df, { frac: 0.1 });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "sample_frac",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
