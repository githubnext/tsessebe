/**
 * Benchmark: index_append — Index.append concatenating two indices
 */
import { Index } from "../../src/index.js";

const ROWS = 50_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data1 = Array.from({ length: ROWS }, (_, i) => `key_${i}`);
const data2 = Array.from({ length: ROWS }, (_, i) => `key_${ROWS + i}`);
const idx1 = new Index(data1);
const idx2 = new Index(data2);

for (let i = 0; i < WARMUP; i++) {
  idx1.append(idx2);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  idx1.append(idx2);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "index_append",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
