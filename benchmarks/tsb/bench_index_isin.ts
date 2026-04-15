/**
 * Benchmark: index_isin — Index.isin() membership check on 100k-element Index
 */
import { Index } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const idx = new Index(Array.from({ length: ROWS }, (_, i) => i));
const lookup = Array.from({ length: 1_000 }, (_, i) => i * 100);

for (let i = 0; i < WARMUP; i++) {
  idx.isin(lookup);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  idx.isin(lookup);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "index_isin",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
