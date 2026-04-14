/**
 * Benchmark: moveColumn on a 100k-row DataFrame
 */
import { DataFrame, moveColumn } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;
const a = Array.from({ length: ROWS }, (_, i) => i);
const b = Array.from({ length: ROWS }, (_, i) => i * 2);
const c = Array.from({ length: ROWS }, (_, i) => i * 3);
const df = DataFrame.fromColumns({ a, b, c });

for (let i = 0; i < WARMUP; i++) moveColumn(df, "c", 0);
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) moveColumn(df, "c", 0);
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "move_column",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
