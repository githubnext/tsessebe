/**
 * Benchmark: dataFrameLe / dataFrameGe — less-than-or-equal and greater-than-or-equal standalone functions on 100k-row DataFrame.
 * Outputs JSON: {"function": "dataframe_compare_lege", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, dataFrameLe, dataFrameGe } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const df = new DataFrame({
  a: Array.from({ length: SIZE }, (_, i) => i),
  b: Array.from({ length: SIZE }, (_, i) => i * 2),
  c: Array.from({ length: SIZE }, (_, i) => i % 100),
});

for (let i = 0; i < WARMUP; i++) {
  dataFrameLe(df, 50);
  dataFrameGe(df, 50);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  dataFrameLe(df, 50);
  dataFrameGe(df, 50);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_compare_lege",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
