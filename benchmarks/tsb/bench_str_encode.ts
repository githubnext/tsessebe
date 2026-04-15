/**
 * Benchmark: str_encode — str.encode byte-length encoding on 100k strings
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Array.from({ length: ROWS }, (_, i) => `hello world ${i}`);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.str.encode();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.str.encode();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "str_encode",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
