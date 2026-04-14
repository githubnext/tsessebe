/**
 * Benchmark: DataFrame.assign({col: series}) on 100k-row DataFrame.
 */
import { DataFrame, Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

const df = DataFrame.fromColumns({
  a: Array.from({ length: ROWS }, (_, i) => i * 1.0),
  b: Array.from({ length: ROWS }, (_, i) => i * 2.0),
});
const newCol = new Series({ data: Array.from({ length: ROWS }, (_, i) => i * 3.0), name: "c" });

for (let i = 0; i < WARMUP; i++) df.assign({ c: newCol });

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  df.assign({ c: newCol });
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ function: "dataframe_assign", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
