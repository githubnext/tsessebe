/**
 * Benchmark: MultiIndex.fromProduct — build from Cartesian product.
 */
import { MultiIndex } from "../../src/index.js";

const WARMUP = 3;
const ITERATIONS = 30;

const level1 = Array.from({ length: 50 }, (_, i) => `a${i}`);
const level2 = Array.from({ length: 100 }, (_, i) => i);

for (let i = 0; i < WARMUP; i++) {
  MultiIndex.fromProduct([level1, level2]);
}

const t0 = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  MultiIndex.fromProduct([level1, level2]);
}
const total = performance.now() - t0;

console.log(
  JSON.stringify({ function: "multi_index_fromproduct", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }),
);
