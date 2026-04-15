/**
 * Benchmark: str_islower_isupper — str.islower and str.isupper on 100k strings
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Array.from({ length: ROWS }, (_, i) => (i % 2 === 0 ? `hello` : `WORLD`));
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.str.islower();
  s.str.isupper();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.str.islower();
  s.str.isupper();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "str_islower_isupper",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
