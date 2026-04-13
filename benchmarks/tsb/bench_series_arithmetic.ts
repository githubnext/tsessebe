/**
 * Benchmark: Series arithmetic (add + multiply on 100k-element Series)
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 5;
const ITERATIONS = 20;

const data = Float64Array.from({ length: ROWS }, (_, i) => i * 0.5);
const s = new Series(data);

for (let i = 0; i < WARMUP; i++) {
  s.add(2.0).mul(0.5);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.add(2.0).mul(0.5);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_arithmetic",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
