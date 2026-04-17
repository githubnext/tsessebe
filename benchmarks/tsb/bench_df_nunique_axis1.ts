/**
 * Benchmark: nuniqueDataFrame with axis=1 — count unique values per row on a 10k-row DataFrame.
 * Outputs JSON: {"function": "df_nunique_axis1", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, Series, nuniqueDataFrame } from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 30;

const df = new DataFrame({
  columns: new Map([
    ["a", new Series({ data: Array.from({ length: SIZE }, (_, i) => i % 5) })],
    ["b", new Series({ data: Array.from({ length: SIZE }, (_, i) => i % 10) })],
    ["c", new Series({ data: Array.from({ length: SIZE }, (_, i) => i % 3) })],
    ["d", new Series({ data: Array.from({ length: SIZE }, (_, i) => i % 7) })],
    ["e", new Series({ data: Array.from({ length: SIZE }, (_, i) => i % 4) })],
  ]),
});

for (let i = 0; i < WARMUP; i++) {
  nuniqueDataFrame(df, { axis: 1 });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  nuniqueDataFrame(df, { axis: 1 });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "df_nunique_axis1",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
