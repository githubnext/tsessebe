/**
 * Benchmark: insertColumn, popColumn, reorderColumns, moveColumn on a 10k-row DataFrame
 *
 * Mirrors pandas DataFrame.insert() and DataFrame.pop() operations.
 */
import { DataFrame, insertColumn, popColumn, reorderColumns, moveColumn } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Array.from({ length: ROWS }, (_, i) => i);
const df = DataFrame.fromColumns({ a: data, b: data, c: data, d: data });
const extraCol = Array.from({ length: ROWS }, (_, i) => i * 2);

for (let i = 0; i < WARMUP; i++) {
  const df2 = insertColumn(df, 2, "x", extraCol);
  popColumn(df2, "x");
  reorderColumns(df, ["d", "c", "b", "a"]);
  moveColumn(df, "c", 0);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  const df2 = insertColumn(df, 2, "x", extraCol);
  popColumn(df2, "x");
  reorderColumns(df, ["d", "c", "b", "a"]);
  moveColumn(df, "c", 0);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "insert_pop",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
