/**
 * Benchmark: DataFrame filter (boolean mask on 100k-row DataFrame)
 */
import { DataFrame } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 5;
const ITERATIONS = 20;

const vals = Float64Array.from({ length: ROWS }, (_, i) => i * 0.1);
const df = new DataFrame({ value: vals });

for (let i = 0; i < WARMUP; i++) {
  df.filter((row) => (row["value"] as number) > 5000);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  df.filter((row) => (row["value"] as number) > 5000);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_filter",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
