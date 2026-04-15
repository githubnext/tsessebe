/**
 * Benchmark: str_slice_get — str.slice and str.get character extraction on 100k strings
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Array.from({ length: ROWS }, (_, i) => `hello_world_${i}`);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.str.slice(0, 5);
  s.str.get(0);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.str.slice(0, 5);
  s.str.get(0);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "str_slice_get",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
