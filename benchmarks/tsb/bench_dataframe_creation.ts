/**
 * Benchmark: DataFrame creation from arrays
 * Creates a 3-column (2 numeric + 1 string) 100k-row DataFrame
 */
import { DataFrame } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const nums1 = Float64Array.from({ length: ROWS }, (_, i) => i * 1.1);
const nums2 = Float64Array.from({ length: ROWS }, (_, i) => i * 2.2);
const strs = Array.from({ length: ROWS }, (_, i) => `label_${i % 100}`);

// Warm up
for (let i = 0; i < WARMUP; i++) {
  new DataFrame({ a: nums1, b: nums2, c: strs });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  new DataFrame({ a: nums1, b: nums2, c: strs });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_creation",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
