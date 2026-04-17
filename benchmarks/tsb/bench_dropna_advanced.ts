/**
 * Benchmark: dropnaDataFrame with advanced options (thresh, subset, axis=1).
 * Outputs JSON: {"function": "dropna_advanced", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, dropnaDataFrame } from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 30;

// DataFrame with scattered null values
const df = DataFrame.fromColumns({
  a: Array.from({ length: SIZE }, (_, i) => (i % 4 === 0 ? null : i * 0.1)),
  b: Array.from({ length: SIZE }, (_, i) => (i % 6 === 0 ? null : i * 2.0)),
  c: Array.from({ length: SIZE }, (_, i) => (i % 8 === 0 ? null : i % 100)),
  d: Array.from({ length: SIZE }, (_, i) => (i % 3 === 0 ? null : `val_${i % 20}`)),
});

for (let i = 0; i < WARMUP; i++) {
  dropnaDataFrame(df, { thresh: 3 });
  dropnaDataFrame(df, { subset: ["a", "b"] });
  dropnaDataFrame(df, { axis: 1 });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  dropnaDataFrame(df, { thresh: 3 });
  dropnaDataFrame(df, { subset: ["a", "b"] });
  dropnaDataFrame(df, { axis: 1 });
}
const total = performance.now() - start;

console.log(JSON.stringify({ function: "dropna_advanced", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
