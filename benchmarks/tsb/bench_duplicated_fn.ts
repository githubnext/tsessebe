/**
 * Benchmark: duplicatedSeries / duplicatedDataFrame — standalone duplicated detection on 100k elements.
 * Outputs JSON: {"function": "duplicated_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, duplicatedSeries, duplicatedDataFrame } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => i % 1000) });
const df = new DataFrame({
  a: Array.from({ length: SIZE }, (_, i) => i % 1000),
  b: Array.from({ length: SIZE }, (_, i) => i % 500),
});

for (let i = 0; i < WARMUP; i++) {
  duplicatedSeries(s);
  duplicatedDataFrame(df);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  duplicatedSeries(s);
  duplicatedDataFrame(df);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "duplicated_fn",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
