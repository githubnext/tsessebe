/**
 * Benchmark: index_duplicated — Index.duplicated() on 100k-element Index with duplicates
 */
import { Index } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

// Create index with ~10% duplicates
const idx = new Index(Array.from({ length: ROWS }, (_, i) => i % 90_000));

for (let i = 0; i < WARMUP; i++) {
  idx.duplicated("first");
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  idx.duplicated("first");
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "index_duplicated",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
