/**
 * Benchmark: applyDataFrameFormatter on 10k-row DataFrame
 */
import { DataFrame, applyDataFrameFormatter, formatFloat } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 3;
const ITERATIONS = 10;
const a = Array.from({ length: ROWS }, (_, i) => i * 1.234);
const b = Array.from({ length: ROWS }, (_, i) => i * 5.678);
const df = DataFrame.fromColumns({ a, b });
const fmt = formatFloat(2);

for (let i = 0; i < WARMUP; i++) applyDataFrameFormatter(df, fmt);
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) applyDataFrameFormatter(df, fmt);
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "apply_dataframe_formatter",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
