/**
 * Benchmark: clipSeriesWithBounds with per-element Series bounds on 100k values.
 * Outputs JSON: {"function": "clip_series_with_bounds", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, clipSeriesWithBounds } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

const data = Array.from({ length: SIZE }, (_, i) => (i % 200) - 100);
const lower = Array.from({ length: SIZE }, (_, i) => (i % 50) - 30);
const upper = Array.from({ length: SIZE }, (_, i) => (i % 50) + 20);

const series = new Series({ data });
const lowerSeries = new Series({ data: lower });
const upperSeries = new Series({ data: upper });

for (let i = 0; i < WARMUP; i++) {
  clipSeriesWithBounds(series, { lower: lowerSeries, upper: upperSeries });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  clipSeriesWithBounds(series, { lower: lowerSeries, upper: upperSeries });
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "clip_series_with_bounds",
    mean_ms: meanMs,
    iterations: ITERATIONS,
    total_ms: totalMs,
  }),
);
