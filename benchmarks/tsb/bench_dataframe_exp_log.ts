/**
 * Benchmark: dataFrameExp / dataFrameLog / dataFrameLog2 / dataFrameLog10 — exponentiation/log on 100k-row DataFrame.
 * Outputs JSON: {"function": "dataframe_exp_log", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, dataFrameExp, dataFrameLog, dataFrameLog2, dataFrameLog10 } from "../../src/index.ts";

const ROWS = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

// Positive values to avoid NaN in log operations
const a = Array.from({ length: ROWS }, (_, i) => (i % 1000) + 1);
const b = Array.from({ length: ROWS }, (_, i) => (i % 500) + 1);
const df = DataFrame.fromColumns({ a, b });

for (let i = 0; i < WARMUP; i++) {
  dataFrameExp(df);
  dataFrameLog(df);
  dataFrameLog2(df);
  dataFrameLog10(df);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  dataFrameExp(df);
  dataFrameLog(df);
  dataFrameLog2(df);
  dataFrameLog10(df);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_exp_log",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
