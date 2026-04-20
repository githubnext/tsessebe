/**
 * Benchmark: dataframe_reflected_arith — dataFrameRadd / dataFrameRsub / dataFrameRmul / dataFrameRdiv.
 * Outputs JSON: {"function": "dataframe_reflected_arith", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, dataFrameRadd, dataFrameRsub, dataFrameRmul, dataFrameRdiv } from "../../src/index.ts";

const SIZE = 50_000;
const WARMUP = 5;
const ITERATIONS = 30;

const df = DataFrame.fromColumns({
  a: Array.from({ length: SIZE }, (_, i) => i * 1.5),
  b: Array.from({ length: SIZE }, (_, i) => (i % 100) + 1),
  c: Array.from({ length: SIZE }, (_, i) => i * 0.25),
});

for (let i = 0; i < WARMUP; i++) {
  dataFrameRadd(df, 10);
  dataFrameRsub(df, 1000);
  dataFrameRmul(df, 3);
  dataFrameRdiv(df, 100);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  dataFrameRadd(df, 10);
  dataFrameRsub(df, 1000);
  dataFrameRmul(df, 3);
  dataFrameRdiv(df, 100);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_reflected_arith",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
