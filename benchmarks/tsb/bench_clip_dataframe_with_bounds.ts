/**
 * Benchmark: clipDataFrameWithBounds with Series bounds (axis=0) on 100k-row DataFrame.
 * Outputs JSON: {"function": "clip_dataframe_with_bounds", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, clipDataFrameWithBounds } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

const df = DataFrame.fromColumns({
  a: Array.from({ length: SIZE }, (_, i) => (i % 200) - 100),
  b: Array.from({ length: SIZE }, (_, i) => (i % 150) - 75),
  c: Array.from({ length: SIZE }, (_, i) => (i % 100) - 50),
});

const lowerBounds = new Series({ data: Array.from({ length: SIZE }, (_, i) => (i % 40) - 20) });
const upperBounds = new Series({ data: Array.from({ length: SIZE }, (_, i) => (i % 40) + 20) });

for (let i = 0; i < WARMUP; i++) {
  clipDataFrameWithBounds(df, { lower: lowerBounds, upper: upperBounds, axis: 0 });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  clipDataFrameWithBounds(df, { lower: lowerBounds, upper: upperBounds, axis: 0 });
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "clip_dataframe_with_bounds",
    mean_ms: meanMs,
    iterations: ITERATIONS,
    total_ms: totalMs,
  }),
);
