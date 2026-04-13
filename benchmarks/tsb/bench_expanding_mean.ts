/**
 * Benchmark: Expanding mean
 *
 * Computes the expanding mean of a large numeric Series.
 * Outputs JSON: {"function": "expanding_mean", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */

import { Series, Expanding } from "../../src/index.ts";

const SIZE = 50_000;
const WARMUP = 5;
const ITERATIONS = 50;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => i * 1.1 + 0.5) });

for (let i = 0; i < WARMUP; i++) {
  new Expanding(s).mean();
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  new Expanding(s).mean();
  const end = performance.now();
  times.push(end - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;

console.log(JSON.stringify({
  function: "expanding_mean",
  mean_ms: Math.round(meanMs * 1000) / 1000,
  iterations: ITERATIONS,
  total_ms: Math.round(totalMs * 1000) / 1000,
}));
