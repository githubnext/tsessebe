/**
 * Benchmark: DataFrameRolling mean on 100k-row DataFrame
 */
import { DataFrame } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;
const a = Array.from({ length: ROWS }, (_, i) => i * 0.1);
const b = Array.from({ length: ROWS }, (_, i) => i * 0.2);
const df = DataFrame.fromColumns({ a, b });

for (let i = 0; i < WARMUP; i++) df.rolling(10).mean();
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) df.rolling(10).mean();
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "dataframe_rolling",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
