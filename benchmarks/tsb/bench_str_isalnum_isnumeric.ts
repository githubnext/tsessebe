/**
 * Benchmark: str_isalnum_isnumeric — str.isalnum and str.isnumeric on 100k strings
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Array.from({ length: ROWS }, (_, i) => (i % 3 === 0 ? `abc123` : i % 3 === 1 ? `12345` : `hello!`));
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.str.isalnum();
  s.str.isnumeric();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.str.isalnum();
  s.str.isnumeric();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "str_isalnum_isnumeric",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
