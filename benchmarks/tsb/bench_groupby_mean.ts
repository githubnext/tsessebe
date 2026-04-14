/**
 * Benchmark: GroupBy mean on 100k-row DataFrame
 */
import { DataFrame } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const keys = Array.from({ length: ROWS }, (_, i) => `group_${i % 100}`);
const vals = Array.from({ length: ROWS }, (_, i) => i * 0.1);
const df = DataFrame.fromColumns({ key: keys, value: vals });

for (let i = 0; i < WARMUP; i++) {
  df.groupby("key").mean();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  df.groupby("key").mean();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "groupby_mean",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
