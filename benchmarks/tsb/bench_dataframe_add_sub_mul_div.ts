/**
 * Benchmark: dataFrameAdd / dataFrameSub / dataFrameMul / dataFrameDiv — standalone DataFrame arithmetic.
 * Outputs JSON: {"function": "dataframe_add_sub_mul_div", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import {
  DataFrame,
  dataFrameAdd,
  dataFrameSub,
  dataFrameMul,
  dataFrameDiv,
} from "../../src/index.ts";

const SIZE = 50_000;
const WARMUP = 5;
const ITERATIONS = 50;

const df = new DataFrame({
  a: Array.from({ length: SIZE }, (_, i) => i * 1.5),
  b: Array.from({ length: SIZE }, (_, i) => i * 2.0),
  c: Array.from({ length: SIZE }, (_, i) => (i % 100) + 1),
});

for (let i = 0; i < WARMUP; i++) {
  dataFrameAdd(df, 10);
  dataFrameSub(df, 5);
  dataFrameMul(df, 2);
  dataFrameDiv(df, 3);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  dataFrameAdd(df, 10);
  dataFrameSub(df, 5);
  dataFrameMul(df, 2);
  dataFrameDiv(df, 3);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_add_sub_mul_div",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
