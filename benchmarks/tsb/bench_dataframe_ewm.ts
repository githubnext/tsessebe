/**
 * Benchmark: DataFrameEwm mean on 10k-row DataFrame
 */
import { DataFrame } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 3;
const ITERATIONS = 10;
const a = Array.from({ length: ROWS }, (_, i) => i * 0.1);
const b = Array.from({ length: ROWS }, (_, i) => i * 0.2);
const df = DataFrame.fromColumns({ a, b });

for (let i = 0; i < WARMUP; i++) df.ewm({ alpha: 0.3 }).mean();
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) df.ewm({ alpha: 0.3 }).mean();
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "dataframe_ewm",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
