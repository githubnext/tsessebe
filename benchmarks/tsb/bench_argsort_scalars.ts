/**
 * Benchmark: argsortScalars / searchsortedMany — sort/search utilities on 100k-element arrays.
 * Outputs JSON: {"function": "argsort_scalars", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { argsortScalars, searchsortedMany } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

// Array of numbers to sort/search
const arr = Array.from({ length: SIZE }, (_, i) => Math.sin(i * 0.001) * SIZE);
// Sorted version for searchsortedMany
const sorted = [...arr].sort((a, b) => (a as number) - (b as number));
// Query values for searchsortedMany
const queries = Array.from({ length: 1000 }, (_, i) => (i - 500) * SIZE / 500);

for (let i = 0; i < WARMUP; i++) {
  argsortScalars(arr);
  searchsortedMany(sorted, queries);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  argsortScalars(arr);
  searchsortedMany(sorted, queries);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "argsort_scalars",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
