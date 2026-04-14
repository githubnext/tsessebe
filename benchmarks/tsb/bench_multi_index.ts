/**
 * Benchmark: MultiIndex construction on 100k pairs
 */
import { MultiIndex } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;
const a = Array.from({ length: ROWS }, (_, i) => `a${i % 100}`);
const b = Array.from({ length: ROWS }, (_, i) => i % 1000);
const tuples: [string, number][] = a.map((v, i) => [v, b[i]]);

for (let i = 0; i < WARMUP; i++) new MultiIndex({ tuples });
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) new MultiIndex({ tuples });
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "multi_index",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
