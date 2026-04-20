/**
 * Benchmark: nunique (DataFrame standalone) — count unique values per column.
 * Outputs JSON: {"function": "nunique_df_standalone_na", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, nunique } from "../../src/index.ts";

const ROWS = 10_000;
const WARMUP = 5;
const ITERATIONS = 100;

const df = DataFrame.fromColumns({
  a: Array.from({ length: ROWS }, (_, i) => i % 100),
  b: Array.from({ length: ROWS }, (_, i) => i % 50),
  c: Array.from({ length: ROWS }, (_, i) => i % 200),
  d: Array.from({ length: ROWS }, (_, i) => (i % 10 === 0 ? null : i % 75)),
  e: Array.from({ length: ROWS }, (_, i) => i % 500),
});

for (let i = 0; i < WARMUP; i++) {
  nunique(df);
  nunique(df, { axis: 0 });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  nunique(df);
  nunique(df, { axis: 0 });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "nunique_df_standalone_na",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
