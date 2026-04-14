/**
 * Benchmark: histogram on 100k-element array
 */
import { histogram } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;
const data = Array.from({ length: ROWS }, (_, i) => (i % 1000) * 0.1);

for (let i = 0; i < WARMUP; i++) histogram(data, { bins: 50 });
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) histogram(data, { bins: 50 });
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "histogram",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
