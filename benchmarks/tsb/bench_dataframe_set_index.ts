/**
 * Benchmark: DataFrame.setIndex(col) on 100k-row DataFrame.
 */
import { DataFrame } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

const df = DataFrame.fromColumns({
  id: Array.from({ length: ROWS }, (_, i) => i),
  a: Array.from({ length: ROWS }, (_, i) => i * 1.5),
  b: Array.from({ length: ROWS }, (_, i) => i * 2.5),
});

for (let i = 0; i < WARMUP; i++) df.setIndex("id");

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  df.setIndex("id");
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ function: "dataframe_set_index", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
