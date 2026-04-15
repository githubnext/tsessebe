/**
 * Benchmark: str_slice_replace — StringAccessor sliceReplace() on 100k strings
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Array.from({ length: ROWS }, (_, i) => `hello_world_${i % 1000}`);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.str.sliceReplace(0, 5, "goodbye");
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.str.sliceReplace(0, 5, "goodbye");
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "str_slice_replace",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
