/**
 * Benchmark: diffDataFrame / shiftDataFrame — diff and shift on 10k-row DataFrame.
 * Outputs JSON: {"function": "diff_shift_df_na", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, diffDataFrame, shiftDataFrame } from "../../src/index.ts";

const ROWS = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

const df = DataFrame.fromColumns({
  a: Array.from({ length: ROWS }, (_, i) => i * 2.0),
  b: Array.from({ length: ROWS }, (_, i) => i * 3.0),
  c: Array.from({ length: ROWS }, (_, i) => i * 0.5),
});

for (let i = 0; i < WARMUP; i++) {
  diffDataFrame(df, { periods: 1 });
  shiftDataFrame(df, { periods: 2 });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  diffDataFrame(df, { periods: 1 });
  shiftDataFrame(df, { periods: 2 });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "diff_shift_df_na",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
