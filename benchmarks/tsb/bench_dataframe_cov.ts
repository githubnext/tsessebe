/**
 * Benchmark: dataFrameCov on a 10k-row, 10-column DataFrame
 */
import { DataFrame, dataFrameCov } from "../../src/index.js";

const ROWS = 10_000;
const COLS = 10;
const WARMUP = 3;
const ITERATIONS = 10;

const data: Record<string, number[]> = {};
for (let c = 0; c < COLS; c++) {
  data[`col${c}`] = Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.01 + c));
}
const df = new DataFrame(data);

for (let i = 0; i < WARMUP; i++) {
  dataFrameCov(df);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  dataFrameCov(df);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_cov",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
