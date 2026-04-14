/**
 * Benchmark: Series nlargest
 *
 * Returns the N largest values from a large numeric Series.
 * Outputs JSON: {"function": "nlargest", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */

import { Series, nlargestSeries } from "../../src/index.ts";

const SIZE = 100_000;
const N = 100;
const WARMUP = 5;
const ITERATIONS = 50;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => (i * 7919) % SIZE) });

for (let i = 0; i < WARMUP; i++) {
  nlargestSeries(s, N);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  nlargestSeries(s, N);
  const end = performance.now();
  times.push(end - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;

console.log(JSON.stringify({
  function: "nlargest",
  mean_ms: Math.round(meanMs * 1000) / 1000,
  iterations: ITERATIONS,
  total_ms: Math.round(totalMs * 1000) / 1000,
}));
