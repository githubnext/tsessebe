/**
 * Benchmark: DataFrame.has(), .col(), .get() — column presence and access on 100k-row DataFrame.
 * Outputs JSON: {"function": "dataframe_has_col_get", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 10;
const ITERATIONS = 100;

const df = new DataFrame({
  a: Array.from({ length: SIZE }, (_, i) => i),
  b: Array.from({ length: SIZE }, (_, i) => i * 2.0),
  c: Array.from({ length: SIZE }, (_, i) => String(i)),
});

for (let i = 0; i < WARMUP; i++) {
  df.has("a");
  df.col("b");
  df.get("c");
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  df.has("a");
  df.col("b");
  df.get("c");
  times.push(performance.now() - t0);
}

const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "dataframe_has_col_get",
    mean_ms: Math.round((total / ITERATIONS) * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(total * 1000) / 1000,
  }),
);
