/**
 * Benchmark: dataframe_apply — apply a function across rows of a 10k-row DataFrame
 * (reduced size due to JS per-row overhead)
 */
import { DataFrame } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 3;
const ITERATIONS = 10;

const a = Array.from({ length: ROWS }, (_, i) => i * 1.0);
const b = Array.from({ length: ROWS }, (_, i) => i * 2.0);
const df = DataFrame.fromColumns({ a, b });

for (let i = 0; i < WARMUP; i++) {
  df.apply((row) => (row.at("a") as number) + (row.at("b") as number), 1);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  df.apply((row) => (row.at("a") as number) + (row.at("b") as number), 1);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_apply",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
