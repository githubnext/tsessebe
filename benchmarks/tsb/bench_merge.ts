/**
 * Benchmark: merge — inner join two 50k-row DataFrames on a key column
 */
import { DataFrame, merge } from "../../src/index.js";

const ROWS = 50_000;
const WARMUP = 3;
const ITERATIONS = 10;

const keys = Array.from({ length: ROWS }, (_, i) => i % 1000);
const vals1 = Float64Array.from({ length: ROWS }, (_, i) => i * 1.0);
const vals2 = Float64Array.from({ length: ROWS }, (_, i) => i * 2.0);
const df1 = new DataFrame({ key: keys, val1: vals1 });
const df2 = new DataFrame({ key: keys, val2: vals2 });

for (let i = 0; i < WARMUP; i++) {
  merge(df1, df2, { on: "key", how: "inner" });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  merge(df1, df2, { on: "key", how: "inner" });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "merge",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
