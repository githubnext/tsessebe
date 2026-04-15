/**
 * Benchmark: cat_reorder_as_ordered — CategoricalAccessor reorderCategories/asOrdered/asUnordered on 100k-element Series
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const cats = ["a", "b", "c", "d"];
const s = new Series({ data: Array.from({ length: ROWS }, (_, i) => cats[i % cats.length]) });

for (let i = 0; i < WARMUP; i++) {
  s.cat.reorderCategories(["d", "c", "b", "a"]);
  s.cat.asOrdered();
  s.cat.asUnordered();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.cat.reorderCategories(["d", "c", "b", "a"]);
  s.cat.asOrdered();
  s.cat.asUnordered();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "cat_reorder_as_ordered",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
