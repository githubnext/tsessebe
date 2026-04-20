/**
 * Benchmark: catIntersectCategories / catDiffCategories — set operations on
 * categorical Series categories (100k-element Series with 20 categories each).
 * Outputs JSON: {"function": "cat_intersect_diff", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, catIntersectCategories, catDiffCategories } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

// Build two categorical Series with overlapping but not identical category sets
const catsA = Array.from({ length: 20 }, (_, i) => `cat_a_${i}`);
const catsB = Array.from({ length: 20 }, (_, i) => `cat_${i < 10 ? "a" : "b"}_${i}`);

const dataA = Array.from({ length: SIZE }, (_, i) => catsA[i % catsA.length]);
const dataB = Array.from({ length: SIZE }, (_, i) => catsB[i % catsB.length]);

const sA = new Series({ data: dataA }).cat.setCategories(catsA);
const sB = new Series({ data: dataB }).cat.setCategories(catsB);

for (let i = 0; i < WARMUP; i++) {
  catIntersectCategories(sA, sB);
  catDiffCategories(sA, sB);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  catIntersectCategories(sA, sB);
  catDiffCategories(sA, sB);
  times.push(performance.now() - t0);
}

const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "cat_intersect_diff",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
