/**
 * Benchmark: anyDataFrame / allDataFrame with axis=1 — row-wise boolean reductions on 100k-row DataFrame.
 * Outputs JSON: {"function": "df_any_all_axis1", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, Series, anyDataFrame, allDataFrame } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 20;

const df = new DataFrame({
  columns: new Map([
    ["a", new Series({ data: Array.from({ length: SIZE }, (_, i) => i % 2 === 0) })],
    ["b", new Series({ data: Array.from({ length: SIZE }, (_, i) => i % 3 !== 0) })],
    ["c", new Series({ data: Array.from({ length: SIZE }, (_, i) => i > 0) })],
    ["d", new Series({ data: Array.from({ length: SIZE }, (_, i) => i % 5 === 0) })],
  ]),
});

for (let i = 0; i < WARMUP; i++) {
  anyDataFrame(df, { axis: 1 });
  allDataFrame(df, { axis: 1 });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  anyDataFrame(df, { axis: 1 });
  allDataFrame(df, { axis: 1 });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "df_any_all_axis1",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
