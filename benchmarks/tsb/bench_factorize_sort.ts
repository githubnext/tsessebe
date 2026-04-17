/**
 * Benchmark: factorize / seriesFactorize with sort=true and useNaSentinel options.
 * Outputs JSON: {"function": "factorize_sort", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { factorize, seriesFactorize, Series } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

const categories = ["zebra", "apple", "mango", "banana", "coconut", "date"];
const data = Array.from({ length: SIZE }, (_, i) =>
  i % 15 === 0 ? null : categories[i % categories.length],
);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  factorize(data, { sort: true });
  factorize(data, { sort: true, useNaSentinel: true });
  seriesFactorize(s, { sort: true });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  factorize(data, { sort: true });
  factorize(data, { sort: true, useNaSentinel: true });
  seriesFactorize(s, { sort: true });
}
const total = performance.now() - start;

console.log(JSON.stringify({ function: "factorize_sort", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
