/**
 * Benchmark: concat — concatenate two 50k-row DataFrames
 */
import { DataFrame, concat } from "../../src/index.js";

const ROWS = 50_000;
const WARMUP = 5;
const ITERATIONS = 20;

const vals1 = Float64Array.from({ length: ROWS }, (_, i) => i * 1.0);
const vals2 = Float64Array.from({ length: ROWS }, (_, i) => i * 2.0);
const df1 = new DataFrame({ value: vals1 });
const df2 = new DataFrame({ value: vals2 });

for (let i = 0; i < WARMUP; i++) {
  concat([df1, df2]);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  concat([df1, df2]);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "concat",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
