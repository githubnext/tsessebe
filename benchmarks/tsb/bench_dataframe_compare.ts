/**
 * Benchmark: dataFrameEq / dataFrameNe / dataFrameLt / dataFrameGt — element-wise compare.
 * Outputs JSON: {"function": "dataframe_compare", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, dataFrameEq, dataFrameNe, dataFrameLt, dataFrameGt } from "../../src/index.ts";

const SIZE = 50_000;
const WARMUP = 5;
const ITERATIONS = 50;

const df = new DataFrame({
  a: Array.from({ length: SIZE }, (_, i) => i),
  b: Array.from({ length: SIZE }, (_, i) => i * 2),
  c: Array.from({ length: SIZE }, (_, i) => i % 100),
});

for (let i = 0; i < WARMUP; i++) {
  dataFrameEq(df, 50);
  dataFrameNe(df, 50);
  dataFrameLt(df, 50);
  dataFrameGt(df, 50);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  dataFrameEq(df, 50);
  dataFrameNe(df, 50);
  dataFrameLt(df, 50);
  dataFrameGt(df, 50);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_compare",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
