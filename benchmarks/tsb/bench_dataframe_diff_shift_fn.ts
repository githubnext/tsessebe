/**
 * Benchmark: diffDataFrame / shiftDataFrame — standalone DataFrame diff and shift functions.
 * Mirrors pandas DataFrame.diff() / DataFrame.shift().
 * Outputs JSON: {"function": "dataframe_diff_shift_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, diffDataFrame, shiftDataFrame } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 20;

const df = DataFrame.fromColumns({
  a: Array.from({ length: SIZE }, (_, i) => i * 1.0),
  b: Array.from({ length: SIZE }, (_, i) => Math.sin(i * 0.01) * 100),
  c: Array.from({ length: SIZE }, (_, i) => i * 2.5),
});

for (let i = 0; i < WARMUP; i++) {
  diffDataFrame(df);
  diffDataFrame(df, { periods: 3 });
  shiftDataFrame(df, { periods: 1 });
  shiftDataFrame(df, { periods: -2 });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  diffDataFrame(df);
  diffDataFrame(df, { periods: 3 });
  shiftDataFrame(df, { periods: 1 });
  shiftDataFrame(df, { periods: -2 });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_diff_shift_fn",
    mean_ms: Math.round((total / ITERATIONS) * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(total * 1000) / 1000,
  }),
);
