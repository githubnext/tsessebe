/**
 * Benchmark: catUnionCategories / catIntersectCategories / catDiffCategories
 */
import {
  Series,
  catUnionCategories,
  catIntersectCategories,
  catDiffCategories,
} from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;
const cats1 = Array.from({ length: 500 }, (_, i) => `cat_${i}`);
const cats2 = Array.from({ length: 500 }, (_, i) => `cat_${i + 250}`);
const s1 = new Series({ data: Array.from({ length: ROWS }, (_, i) => cats1[i % cats1.length]) });
const s2 = new Series({ data: Array.from({ length: ROWS }, (_, i) => cats2[i % cats2.length]) });

for (let i = 0; i < WARMUP; i++) {
  catUnionCategories(s1, s2);
  catIntersectCategories(s1, s2);
  catDiffCategories(s1, s2);
}
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  catUnionCategories(s1, s2);
  catIntersectCategories(s1, s2);
  catDiffCategories(s1, s2);
}
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "cat_set_ops",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
