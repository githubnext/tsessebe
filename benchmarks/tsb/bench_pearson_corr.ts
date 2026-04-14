/**
 * Benchmark: Pearson correlation between two 100k-element Series
 */
import { Series, pearsonCorr } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const a = Float64Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.01));
const b = Float64Array.from({ length: ROWS }, (_, i) => Math.cos(i * 0.01));
const sa = new Series(a);
const sb = new Series(b);

for (let i = 0; i < WARMUP; i++) {
  pearsonCorr(sa, sb);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  pearsonCorr(sa, sb);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "pearson_corr",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
