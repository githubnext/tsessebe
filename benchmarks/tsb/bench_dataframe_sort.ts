/**
 * Benchmark: dataframe_sort — sort a 100k-row DataFrame by two columns
 */
import { DataFrame } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const a = Array.from({ length: ROWS }, (_, i) => `group_${i % 100}`);
const b = Float64Array.from({ length: ROWS }, () => Math.random() * 1000);
const df = new DataFrame({ a, b });

for (let i = 0; i < WARMUP; i++) {
  df.sort_values(["a", "b"]);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  df.sort_values(["a", "b"]);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_sort",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
