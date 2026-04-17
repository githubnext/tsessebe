/**
 * Benchmark: DataFrameRolling.min() and DataFrameRolling.max() on a 50k-row DataFrame.
 * Outputs JSON: {"function": "dataframe_rolling_min_max", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame } from "../../src/index.ts";

const SIZE = 50_000;
const WINDOW = 20;
const WARMUP = 5;
const ITERATIONS = 30;

const df = DataFrame.fromColumns({
  a: Array.from({ length: SIZE }, (_, i) => Math.sin(i * 0.01) * 100),
  b: Array.from({ length: SIZE }, (_, i) => Math.cos(i * 0.01) * 50),
  c: Array.from({ length: SIZE }, (_, i) => (i % 100) * 1.5),
});

for (let i = 0; i < WARMUP; i++) {
  df.rolling(WINDOW).min();
  df.rolling(WINDOW).max();
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  df.rolling(WINDOW).min();
  df.rolling(WINDOW).max();
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "dataframe_rolling_min_max",
    mean_ms: meanMs,
    iterations: ITERATIONS,
    total_ms: totalMs,
  }),
);
