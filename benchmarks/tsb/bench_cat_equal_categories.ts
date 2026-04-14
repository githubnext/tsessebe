/**
 * Benchmark: catEqualCategories on two categorical Series (10k iterations)
 */
import { Series, catEqualCategories } from "../../src/index.js";

const WARMUP = 3;
const ITERATIONS = 10;
const s1 = new Series({ data: ["cat_0", "cat_1", "cat_2"] });
const s2 = new Series({ data: ["cat_0", "cat_1", "cat_2"] });
const REPS = 10_000;

for (let i = 0; i < WARMUP; i++) {
  for (let j = 0; j < REPS; j++) catEqualCategories(s1, s2);
}
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  for (let j = 0; j < REPS; j++) catEqualCategories(s1, s2);
}
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "cat_equal_categories",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
