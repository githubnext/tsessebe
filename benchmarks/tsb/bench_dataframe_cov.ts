/**
 * Benchmark: DataFrame covariance matrix on 1000x10 DataFrame
 */
import { DataFrame, dataFrameCov } from "../../src/index.js";

const ROWS = 1_000;
const COLS = 10;
const WARMUP = 3;
const ITERATIONS = 10;

const columns: Record<string, number[]> = {};
for (let c = 0; c < COLS; c++) {
  columns[`col${c}`] = Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.01 + c));
}
const df = new DataFrame(columns);

for (let i = 0; i < WARMUP; i++) {
  dataFrameCov(df);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  dataFrameCov(df);
}
const total = performance.now() - start;

console.log(JSON.stringify({ function: "dataframe_cov", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
