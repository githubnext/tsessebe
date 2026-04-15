/**
 * Benchmark: series_string_ops — str.upper and str.contains on 100k strings
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Array.from({ length: ROWS }, (_, i) => `hello_world_${i % 200}`);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.str.upper();
  s.str.contains("world");
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.str.upper();
  s.str.contains("world");
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_string_ops",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
