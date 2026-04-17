/**
 * Benchmark: dropDuplicatesSeries / dropDuplicatesDataFrame — standalone drop-duplicates on 100k elements.
 * Outputs JSON: {"function": "drop_duplicates_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, dropDuplicatesSeries, dropDuplicatesDataFrame } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => i % 1000) });
const df = new DataFrame({
  a: Array.from({ length: SIZE }, (_, i) => i % 1000),
  b: Array.from({ length: SIZE }, (_, i) => i % 500),
});

for (let i = 0; i < WARMUP; i++) {
  dropDuplicatesSeries(s);
  dropDuplicatesDataFrame(df);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  dropDuplicatesSeries(s);
  dropDuplicatesDataFrame(df);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "drop_duplicates_fn",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
