/**
 * Benchmark: dataFrameShift / dataFrameDiff — shift and diff on a 50k-row DataFrame.
 * Outputs JSON: {"function": "dataframe_shift_diff", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, dataFrameShift, dataFrameDiff } from "../../src/index.ts";

const SIZE = 50_000;
const WARMUP = 5;
const ITERATIONS = 50;

const df = new DataFrame({
  a: Array.from({ length: SIZE }, (_, i) => i * 1.5),
  b: Array.from({ length: SIZE }, (_, i) => Math.sin(i * 0.01) * 100),
  c: Array.from({ length: SIZE }, (_, i) => i % 200),
});

for (let i = 0; i < WARMUP; i++) {
  dataFrameShift(df, 1);
  dataFrameDiff(df, 1);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  dataFrameShift(df, 1);
  dataFrameDiff(df, 1);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_shift_diff",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
