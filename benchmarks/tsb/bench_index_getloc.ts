/**
 * Benchmark: Index.getLoc — locate positions of a label in an index.
 */
import { Index } from "../../src/index.js";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 30;

// Index with unique labels
const labels = Array.from({ length: SIZE }, (_, i) => i);
const idx = new Index(labels);

for (let i = 0; i < WARMUP; i++) {
  idx.getLoc(5000);
}

const t0 = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  idx.getLoc(i % SIZE);
}
const total = performance.now() - t0;

console.log(
  JSON.stringify({ function: "index_getloc", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }),
);
