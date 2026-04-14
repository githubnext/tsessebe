/**
 * Benchmark: DataFrame.toRecords() on 100k-row DataFrame.
 */
import { DataFrame } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const df = DataFrame.fromColumns({
  a: Array.from({ length: ROWS }, (_, i) => i * 1.0),
  b: Array.from({ length: ROWS }, (_, i) => i * 2.0),
});

for (let i = 0; i < WARMUP; i++) df.toRecords();

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  df.toRecords();
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ function: "dataframe_to_records", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
