/**
 * Benchmark: dataframe_dropna — drop rows with NaN values from 100k-row DataFrame
 */
import { DataFrame } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 5;
const ITERATIONS = 20;

const a = Float64Array.from({ length: ROWS }, (_, i) => (i % 10 === 0 ? NaN : i * 1.1));
const b = Float64Array.from({ length: ROWS }, (_, i) => (i % 7 === 0 ? NaN : i * 2.2));
const df = new DataFrame({ a, b });

for (let i = 0; i < WARMUP; i++) {
  df.dropna();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  df.dropna();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_dropna",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
