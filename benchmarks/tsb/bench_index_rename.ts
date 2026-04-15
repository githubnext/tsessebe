/**
 * Benchmark: index_rename — Index.rename changing the index name
 */
import { Index } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Array.from({ length: ROWS }, (_, i) => `key_${i}`);
const idx = new Index(data, "original_name");

for (let i = 0; i < WARMUP; i++) {
  idx.rename("new_name");
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  idx.rename("new_name");
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "index_rename",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
