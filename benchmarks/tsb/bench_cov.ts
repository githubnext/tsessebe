/**
 * Benchmark: DataFrame.cov — pairwise covariance of numeric columns.
 * Outputs JSON: {"function": "cov", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame } from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

const df = new DataFrame({
  a: Array.from({ length: SIZE }, (_, i) => i * 1.1),
  b: Array.from({ length: SIZE }, (_, i) => i * 0.7 + 0.3),
  c: Array.from({ length: SIZE }, (_, i) => i * -0.5 + 100),
});

for (let i = 0; i < WARMUP; i++) {
  df.cov();
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  df.cov();
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "cov",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
