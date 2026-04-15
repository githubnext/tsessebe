/**
 * Benchmark: insertColumn on a 100k-row DataFrame
 */
import { DataFrame, insertColumn } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const a = Array.from({ length: ROWS }, (_, i) => i);
const b = Array.from({ length: ROWS }, (_, i) => i * 2);
const newCol = Array.from({ length: ROWS }, (_, i) => i * 3);
const df = DataFrame.fromColumns({ a, b });

for (let i = 0; i < WARMUP; i++) {
  insertColumn(df, 1, "c", newCol);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  insertColumn(df, 1, "c", newCol);
}
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "insert_column",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
