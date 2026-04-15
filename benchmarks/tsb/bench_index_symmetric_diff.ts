/**
 * Benchmark: Index.symmetricDifference on 10k-element integer indexes
 */
import { Index } from "../../src/index.js";

const N = 10_000;
const a = new Index(Array.from({ length: N }, (_, i) => i));
const b = new Index(Array.from({ length: N }, (_, i) => i + N / 2));

const WARMUP = 3;
const ITERATIONS = 50;

for (let i = 0; i < WARMUP; i++) {
  a.symmetricDifference(b);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  a.symmetricDifference(b);
}
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "index_symmetric_diff",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
