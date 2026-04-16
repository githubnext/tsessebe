/**
 * Benchmark: MultiIndex.fromArrays — build from separate level arrays.
 */
import { MultiIndex } from "../../src/index.js";

const SIZE = 5_000;
const WARMUP = 3;
const ITERATIONS = 20;

const arr1 = Array.from({ length: SIZE }, (_, i) => `a${i % 50}`);
const arr2 = Array.from({ length: SIZE }, (_, i) => i % 100);

for (let i = 0; i < WARMUP; i++) {
  MultiIndex.fromArrays([arr1, arr2]);
}

const t0 = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  MultiIndex.fromArrays([arr1, arr2]);
}
const total = performance.now() - t0;

console.log(
  JSON.stringify({ function: "multi_index_fromarrays", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }),
);
