/**
 * Benchmark: insertColumn on 10000x3 DataFrame
 */
import { DataFrame, insertColumn } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 3;
const ITERATIONS = 20;

const newCol = Float64Array.from({ length: ROWS }, (_, i) => i * 4);

for (let i = 0; i < WARMUP; i++) {
  const df = new DataFrame({
    a: Float64Array.from({ length: ROWS }, (_, j) => j),
    b: Float64Array.from({ length: ROWS }, (_, j) => j * 2),
    c: Float64Array.from({ length: ROWS }, (_, j) => j * 3),
  });
  insertColumn(df, 1, "new_col", newCol);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  const df = new DataFrame({
    a: Float64Array.from({ length: ROWS }, (_, j) => j),
    b: Float64Array.from({ length: ROWS }, (_, j) => j * 2),
    c: Float64Array.from({ length: ROWS }, (_, j) => j * 3),
  });
  insertColumn(df, 1, "new_col", newCol);
}
const total = performance.now() - start;

console.log(JSON.stringify({ function: "insert_column", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
