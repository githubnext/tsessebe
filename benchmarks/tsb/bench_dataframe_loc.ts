/**
 * Benchmark: DataFrame.loc(labels[]) on 100k-row DataFrame.
 */
import { DataFrame, Index } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

const rowLabels = Array.from({ length: ROWS }, (_, i) => i);
const df = DataFrame.fromColumns(
  { a: Array.from({ length: ROWS }, (_, i) => i * 1.0), b: Array.from({ length: ROWS }, (_, i) => i * 2.0) },
  { index: new Index(rowLabels) },
);
const selectLabels = Array.from({ length: 1000 }, (_, i) => i * 100);

for (let i = 0; i < WARMUP; i++) df.loc(selectLabels);

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  df.loc(selectLabels);
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ function: "dataframe_loc", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
