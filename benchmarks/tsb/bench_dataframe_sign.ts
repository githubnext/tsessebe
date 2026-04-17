/**
 * Benchmark: dataFrameSign — sign operation on 100k-row DataFrame.
 * Outputs JSON: {"function": "dataframe_sign", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, dataFrameSign } from "../../src/index.ts";

const ROWS = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const df = DataFrame.fromColumns({
  a: Array.from({ length: ROWS }, (_, i) => (i % 200) - 100),
  b: Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.01) * 1000),
  c: Array.from({ length: ROWS }, (_, i) => (i % 3) - 1),
});

for (let i = 0; i < WARMUP; i++) {
  dataFrameSign(df);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  dataFrameSign(df);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_sign",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
