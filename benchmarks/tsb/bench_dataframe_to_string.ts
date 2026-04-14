/**
 * Benchmark: dataFrameToString on 1k-row DataFrame
 */
import { DataFrame, dataFrameToString } from "../../src/index.js";

const ROWS = 1_000;
const WARMUP = 3;
const ITERATIONS = 10;
const a = Array.from({ length: ROWS }, (_, i) => i);
const b = Array.from({ length: ROWS }, (_, i) => i * 1.5);
const df = DataFrame.fromColumns({ a, b });

for (let i = 0; i < WARMUP; i++) dataFrameToString(df);
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) dataFrameToString(df);
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "dataframe_to_string",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
