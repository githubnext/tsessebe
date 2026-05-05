/**
 * Benchmark: mergeOrdered — ordered merge of two 10k-row DataFrames on a key column
 */
import { DataFrame, mergeOrdered } from "../../src/index.js";

const N = 10_000;
const WARMUP = 2;
const ITERATIONS = 5;

// Two sorted DataFrames sharing some keys
const keys1 = Array.from({ length: N }, (_, i) => i * 2);
const vals1 = Array.from({ length: N }, (_, i) => i * 1.0);
const keys2 = Array.from({ length: N }, (_, i) => i * 3);
const vals2 = Array.from({ length: N }, (_, i) => i * 2.0);

const df1 = DataFrame.fromColumns({ key: keys1, val1: vals1 });
const df2 = DataFrame.fromColumns({ key: keys2, val2: vals2 });

for (let i = 0; i < WARMUP; i++) {
  mergeOrdered(df1, df2, { on: "key" });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  mergeOrdered(df1, df2, { on: "key" });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "merge_ordered",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
