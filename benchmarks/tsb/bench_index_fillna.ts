/**
 * Benchmark: index_fillna — Index.fillna replacing null values on 100k-element index
 */
import { Index } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Array.from({ length: ROWS }, (_, i) => (i % 10 === 0 ? null : `key_${i}`));
const idx = new Index(data);

for (let i = 0; i < WARMUP; i++) {
  idx.fillna("missing");
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  idx.fillna("missing");
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "index_fillna",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
