/**
 * Benchmark: DataFrame.sortIndex() on 100k-row DataFrame with shuffled index.
 */
import { DataFrame, Index } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const shuffled = Array.from({ length: ROWS }, (_, i) => ROWS - i - 1);
const idx = new Index(shuffled);
const df = DataFrame.fromColumns(
  {
    a: Array.from({ length: ROWS }, (_, i) => i * 1.1),
    b: Array.from({ length: ROWS }, (_, i) => i * 2.2),
  },
  { index: idx },
);

for (let i = 0; i < WARMUP; i++) df.sortIndex();

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  df.sortIndex();
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ function: "dataframe_sort_index", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
