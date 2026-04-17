/**
 * Benchmark: dataFrameIsin — test membership of each element in a DataFrame against value sets.
 * Outputs JSON: {"function": "dataframe_isin_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { dataFrameIsin, DataFrame } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const df = new DataFrame({
  a: Array.from({ length: SIZE }, (_, i) => i % 20),
  b: Array.from({ length: SIZE }, (_, i) => ["x", "y", "z", "w"][i % 4]),
  c: Array.from({ length: SIZE }, (_, i) => i % 10),
});

// Global isin — check all columns
const globalValues = [0, 1, 2, "x", "y"];
// Per-column isin dict
const colValues = { a: [0, 1, 2, 3, 4], b: ["x", "y"], c: [0, 5] };

for (let i = 0; i < WARMUP; i++) {
  dataFrameIsin(df, globalValues);
  dataFrameIsin(df, colValues);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  dataFrameIsin(df, globalValues);
  dataFrameIsin(df, colValues);
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "dataframe_isin_fn",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
