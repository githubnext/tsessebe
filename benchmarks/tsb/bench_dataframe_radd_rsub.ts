/**
 * Benchmark: dataFrameRadd / dataFrameRsub / dataFrameRmul / dataFrameRdiv — reverse arithmetic on 100k-row DataFrame.
 * Outputs JSON: {"function": "dataframe_radd_rsub", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import {
  DataFrame,
  Series,
  dataFrameRadd,
  dataFrameRsub,
  dataFrameRmul,
  dataFrameRdiv,
} from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const df = new DataFrame({
  columns: new Map([
    ["x", new Series({ data: Array.from({ length: SIZE }, (_, i) => (i % 1000) + 1) })],
    ["y", new Series({ data: Array.from({ length: SIZE }, (_, i) => (i % 500) + 0.5) })],
  ]),
});

for (let i = 0; i < WARMUP; i++) {
  dataFrameRadd(df, 100);
  dataFrameRsub(df, 100);
  dataFrameRmul(df, 2);
  dataFrameRdiv(df, 1000);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  dataFrameRadd(df, 100);
  dataFrameRsub(df, 100);
  dataFrameRmul(df, 2);
  dataFrameRdiv(df, 1000);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_radd_rsub",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
