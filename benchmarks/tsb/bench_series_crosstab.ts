/**
 * Benchmark: seriesCrosstab — cross-tabulation of two categorical Series.
 * Outputs JSON: {"function": "series_crosstab", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, seriesCrosstab } from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 20;

const CATEGORIES_A = ["apple", "banana", "cherry", "date", "elderberry"];
const CATEGORIES_B = ["north", "south", "east", "west"];

const a = new Series({
  data: Array.from({ length: SIZE }, (_, i) => CATEGORIES_A[i % CATEGORIES_A.length]),
  name: "product",
});
const b = new Series({
  data: Array.from({ length: SIZE }, (_, i) => CATEGORIES_B[i % CATEGORIES_B.length]),
  name: "region",
});

for (let i = 0; i < WARMUP; i++) {
  seriesCrosstab(a, b);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  seriesCrosstab(a, b);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_crosstab",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
