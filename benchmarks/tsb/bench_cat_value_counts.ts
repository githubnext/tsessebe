/**
 * Benchmark: cat_value_counts — CategoricalAccessor.valueCounts() on 100k-element Series
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const cats = ["a", "b", "c", "d", "e"];
const s = new Series({ data: Array.from({ length: ROWS }, (_, i) => cats[i % cats.length]) });

for (let i = 0; i < WARMUP; i++) {
  s.cat.valueCounts();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.cat.valueCounts();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "cat_value_counts",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
