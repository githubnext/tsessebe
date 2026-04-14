/**
 * Benchmark: dataFrameApplyMap on 10k-row DataFrame
 */
import { DataFrame, dataFrameApplyMap } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 3;
const ITERATIONS = 10;
const a = Array.from({ length: ROWS }, (_, i) => i * 0.1);
const b = Array.from({ length: ROWS }, (_, i) => i * 0.2);
const df = DataFrame.fromColumns({ a, b });

for (let i = 0; i < WARMUP; i++) dataFrameApplyMap(df, (v) => (v as number) + 1);
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) dataFrameApplyMap(df, (v) => (v as number) + 1);
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "dataframe_apply_map",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
