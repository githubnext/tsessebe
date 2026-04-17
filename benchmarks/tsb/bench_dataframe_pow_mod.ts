/**
 * Benchmark: dataFramePow / dataFrameMod / dataFrameFloorDiv — power, modulo, floor division on DataFrame.
 * Outputs JSON: {"function": "dataframe_pow_mod", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, dataFramePow, dataFrameMod, dataFrameFloorDiv } from "../../src/index.ts";

const SIZE = 50_000;
const WARMUP = 5;
const ITERATIONS = 50;

const df = new DataFrame({
  a: Array.from({ length: SIZE }, (_, i) => (i % 10) + 1),
  b: Array.from({ length: SIZE }, (_, i) => (i % 7) + 1),
  c: Array.from({ length: SIZE }, (_, i) => (i % 5) + 1),
});

for (let i = 0; i < WARMUP; i++) {
  dataFramePow(df, 2);
  dataFrameMod(df, 3);
  dataFrameFloorDiv(df, 2);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  dataFramePow(df, 2);
  dataFrameMod(df, 3);
  dataFrameFloorDiv(df, 2);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_pow_mod",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
