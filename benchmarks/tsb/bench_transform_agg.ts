/**
 * Benchmark: seriesTransform — transform a 100k-element Series
 */
import { Series, seriesTransform } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Float64Array.from({ length: ROWS }, (_, i) => (i % 500) + 1);
const s = new Series({ data, index: Array.from({ length: ROWS }, (_, i) => i % 500) });

for (let i = 0; i < WARMUP; i++) {
  seriesTransform(s, "mean");
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  seriesTransform(s, "mean");
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "transform_agg",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
