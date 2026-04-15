/**
 * Benchmark: str_wrap — str.wrap word wrapping on 100k strings
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Array.from({ length: ROWS }, () => `the quick brown fox jumps over the lazy dog`);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.str.wrap(20);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.str.wrap(20);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "str_wrap",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
