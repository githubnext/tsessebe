/**
 * Benchmark: clipSeriesWithBounds / clipDataFrameWithBounds — clip with lower/upper bounds.
 * Outputs JSON: {"function": "clip_series_bounds", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, clipSeriesWithBounds, clipDataFrameWithBounds } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => i - SIZE / 2) });
const lower = new Series({ data: Array.from({ length: SIZE }, () => -10000) });
const upper = new Series({ data: Array.from({ length: SIZE }, () => 10000) });

const df = new DataFrame({
  a: Array.from({ length: SIZE }, (_, i) => i - SIZE / 2),
  b: Array.from({ length: SIZE }, (_, i) => Math.sin(i * 0.01) * 100),
});
const dfLower = new DataFrame({
  a: Array.from({ length: SIZE }, () => -10000),
  b: Array.from({ length: SIZE }, () => -50),
});
const dfUpper = new DataFrame({
  a: Array.from({ length: SIZE }, () => 10000),
  b: Array.from({ length: SIZE }, () => 50),
});

for (let i = 0; i < WARMUP; i++) {
  clipSeriesWithBounds(s, lower, upper);
  clipDataFrameWithBounds(df, dfLower, dfUpper);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  clipSeriesWithBounds(s, lower, upper);
  clipDataFrameWithBounds(df, dfLower, dfUpper);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "clip_series_bounds",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
