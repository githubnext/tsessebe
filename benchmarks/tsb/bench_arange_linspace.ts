/**
 * Benchmark: arange and linspace generating 100k-element arrays
 */
import { arange, linspace } from "../../src/index.js";

const N = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

for (let i = 0; i < WARMUP; i++) {
  arange(0, N, 1);
  linspace(0, 1, N);
}
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  arange(0, N, 1);
  linspace(0, 1, N);
}
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "arange_linspace",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
