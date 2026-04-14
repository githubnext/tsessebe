/**
 * Benchmark: catCrossTab on two 100k-element categorical Series
 */
import { Series, catCrossTab } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;
const cats1 = ["a", "b", "c", "d"];
const cats2 = ["x", "y", "z"];
const s1 = new Series({ data: Array.from({ length: ROWS }, (_, i) => cats1[i % 4]) });
const s2 = new Series({ data: Array.from({ length: ROWS }, (_, i) => cats2[i % 3]) });

for (let i = 0; i < WARMUP; i++) catCrossTab(s1, s2);
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) catCrossTab(s1, s2);
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "cat_cross_tab",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
