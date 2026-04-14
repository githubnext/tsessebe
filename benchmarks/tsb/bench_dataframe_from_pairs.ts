/**
 * Benchmark: DataFrame.fromColumns with object of arrays (100k rows)
 */
import { DataFrame } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;
const a = Array.from({ length: ROWS }, (_, i) => i);
const b = Array.from({ length: ROWS }, (_, i) => i * 2.5);
const c = Array.from({ length: ROWS }, (_, i) => `str_${i % 1000}`);

for (let i = 0; i < WARMUP; i++) DataFrame.fromColumns({ a, b, c });
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) DataFrame.fromColumns({ a, b, c });
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "dataframe_from_pairs",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
