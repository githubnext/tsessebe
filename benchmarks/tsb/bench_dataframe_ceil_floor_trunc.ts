/**
 * Benchmark: dataFrameCeil / dataFrameFloor / dataFrameTrunc / dataFrameSqrt — math rounding on 100k-row DataFrame.
 * Outputs JSON: {"function": "dataframe_ceil_floor_trunc", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, dataFrameCeil, dataFrameFloor, dataFrameTrunc, dataFrameSqrt } from "../../src/index.ts";

const ROWS = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

const a = Array.from({ length: ROWS }, (_, i) => (i % 1000) * 0.7 + 0.3);
const b = Array.from({ length: ROWS }, (_, i) => (i % 500) * 1.3 + 0.1);
const df = DataFrame.fromColumns({ a, b });

for (let i = 0; i < WARMUP; i++) {
  dataFrameCeil(df);
  dataFrameFloor(df);
  dataFrameTrunc(df);
  dataFrameSqrt(df);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  dataFrameCeil(df);
  dataFrameFloor(df);
  dataFrameTrunc(df);
  dataFrameSqrt(df);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_ceil_floor_trunc",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
