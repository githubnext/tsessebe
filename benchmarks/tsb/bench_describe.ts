/**
 * Benchmark: describe — summary statistics on a 100k-row DataFrame
 */
import { DataFrame } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const a = Array.from({ length: ROWS }, (_, i) => i * 1.1);
const b = Array.from({ length: ROWS }, (_, i) => Math.sqrt(i + 1));
const df = DataFrame.fromColumns({ a, b });

for (let i = 0; i < WARMUP; i++) {
  df.describe();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  df.describe();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "describe",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
