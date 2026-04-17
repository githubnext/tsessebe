/**
 * Benchmark: combineFirstDataFrame — fill NaN values from another DataFrame (union of indexes).
 * Mirrors pandas DataFrame.combine_first.
 * Outputs JSON: {"function": "combine_first_dataframe", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, Index, combineFirstDataFrame } from "../../src/index.ts";

const SIZE = 5_000;
const WARMUP = 5;
const ITERATIONS = 30;

// df1: rows 0..SIZE-1, ~30% nulls
const rows1 = Array.from({ length: SIZE }, (_, i) => i);
const data1a = Array.from({ length: SIZE }, (_, i) => (i % 3 === 0 ? null : i * 1.5));
const data1b = Array.from({ length: SIZE }, (_, i) => (i % 5 === 0 ? null : i * 0.5));
const idx1 = new Index(rows1);
const df1 = new DataFrame({ a: data1a, b: data1b }, idx1);

// df2: rows 0..SIZE+500-1 (overlapping + extra), fills missing in df1
const rows2 = Array.from({ length: SIZE + 500 }, (_, i) => i);
const data2a = Array.from({ length: SIZE + 500 }, (_, i) => i * 2.0);
const data2b = Array.from({ length: SIZE + 500 }, (_, i) => i * 1.0);
const data2c = Array.from({ length: SIZE + 500 }, (_, i) => i * 0.1);
const idx2 = new Index(rows2);
const df2 = new DataFrame({ a: data2a, b: data2b, c: data2c }, idx2);

for (let i = 0; i < WARMUP; i++) {
  combineFirstDataFrame(df1, df2);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  combineFirstDataFrame(df1, df2);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "combine_first_dataframe",
    mean_ms: Math.round((total / ITERATIONS) * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(total * 1000) / 1000,
  }),
);
