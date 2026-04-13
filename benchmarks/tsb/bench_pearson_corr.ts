/**
 * Benchmark: Pearson correlation
 *
 * Computes the Pearson correlation coefficient between two large numeric Series.
 * Outputs JSON: {"function": "pearson_corr", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */

import { Series, pearsonCorr } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const x = new Series({ data: Array.from({ length: SIZE }, (_, i) => i * 1.1 + 0.5) });
const y = new Series({ data: Array.from({ length: SIZE }, (_, i) => i * 0.9 - 0.3) });

for (let i = 0; i < WARMUP; i++) {
  pearsonCorr(x, y);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  pearsonCorr(x, y);
  const end = performance.now();
  times.push(end - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;

console.log(JSON.stringify({
  function: "pearson_corr",
  mean_ms: Math.round(meanMs * 1000) / 1000,
  iterations: ITERATIONS,
  total_ms: Math.round(totalMs * 1000) / 1000,
}));
