/**
 * Benchmark: DataFrame.median() — column-wise median on a 100k-row DataFrame.
 * Outputs JSON: {"function": "dataframe_median", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

const df = DataFrame.fromColumns({
  a: Array.from({ length: SIZE }, (_, i) => (i * 1.23) % 9000),
  b: Array.from({ length: SIZE }, (_, i) => (i * 4.56) % 7000),
  c: Array.from({ length: SIZE }, (_, i) => (i * 7.89) % 5000),
});

for (let i = 0; i < WARMUP; i++) {
  df.median();
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  df.median();
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "dataframe_median",
    mean_ms: meanMs,
    iterations: ITERATIONS,
    total_ms: totalMs,
  }),
);
