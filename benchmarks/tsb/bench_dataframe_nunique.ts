/**
 * Benchmark: nuniqueDataFrame — count unique values per column on 100k-row DataFrame.
 * Outputs JSON: {"function": "dataframe_nunique", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, Series, nuniqueDataFrame } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 20;

const df = new DataFrame({
  columns: new Map([
    ["cat", new Series({ data: Array.from({ length: SIZE }, (_, i) => i % 100) })],
    ["val", new Series({ data: Array.from({ length: SIZE }, (_, i) => i % 500) })],
    ["grp", new Series({ data: Array.from({ length: SIZE }, (_, i) => i % 10) })],
  ]),
});

for (let i = 0; i < WARMUP; i++) {
  nuniqueDataFrame(df);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  nuniqueDataFrame(df);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_nunique",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
