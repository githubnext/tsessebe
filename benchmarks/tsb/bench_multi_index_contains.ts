/**
 * Benchmark: MultiIndex.contains — check if a tuple key exists in the index.
 */
import { MultiIndex } from "../../src/index.js";

const SIZE = 5_000;
const WARMUP = 5;
const ITERATIONS = 50;

const arr1 = Array.from({ length: SIZE }, (_, i) => `a${i % 50}`);
const arr2 = Array.from({ length: SIZE }, (_, i) => i % 100);
const mi = MultiIndex.fromArrays([arr1, arr2]);

for (let i = 0; i < WARMUP; i++) {
  mi.contains(["a0", 0]);
}

const t0 = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  mi.contains([`a${i % 50}`, i % 100]);
}
const total = performance.now() - t0;

console.log(
  JSON.stringify({ function: "multi_index_contains", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }),
);
