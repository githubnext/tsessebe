/**
 * Benchmark: DataFrame.groupby(by).agg('std') on 100k-row DataFrame.
 */
import { DataFrame } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const df = DataFrame.fromColumns({
  group: Array.from({ length: ROWS }, (_, i) => i % 50),
  a: Array.from({ length: ROWS }, (_, i) => (i * 1.23) % 9999),
  b: Array.from({ length: ROWS }, (_, i) => (i * 4.56) % 9999),
});

for (let i = 0; i < WARMUP; i++) df.groupby("group").agg("std");

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  df.groupby("group").agg("std");
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ function: "groupby_std_df", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
