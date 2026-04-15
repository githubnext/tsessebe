/**
 * Benchmark: Series creation
 *
 * Creates a Series from a large numeric array and measures the time.
 * Outputs JSON: {"function": "series_creation", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */

import { Series } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

/** Generate a deterministic numeric array of the given size. */
function generateData(n: number): readonly number[] {
  const arr: number[] = [];
  for (let i = 0; i < n; i++) {
    arr.push(i * 1.1 + 0.5);
  }
  return arr;
}

const data = generateData(SIZE);

// Warm-up
for (let i = 0; i < WARMUP; i++) {
  new Series({ data: [...data] });
}

// Measured runs
const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  new Series({ data: [...data] });
  const end = performance.now();
  times.push(end - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;

const result = {
  function: "series_creation",
  mean_ms: Math.round(meanMs * 1000) / 1000,
  iterations: ITERATIONS,
  total_ms: Math.round(totalMs * 1000) / 1000,
};

console.log(JSON.stringify(result));
