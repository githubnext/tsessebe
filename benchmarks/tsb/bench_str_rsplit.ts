/**
 * Benchmark: str_rsplit — StringAccessor rsplit() on 100k strings
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Array.from({ length: ROWS }, (_, i) => `part_${i % 100}_b_c_d`);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.str.rsplit("_", undefined, 2);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.str.rsplit("_", undefined, 2);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "str_rsplit",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
