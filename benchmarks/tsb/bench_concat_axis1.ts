/**
 * Benchmark: concat([df1, df2], { axis: 1 }) — column-wise concat on 100k-row DataFrames.
 */
import { DataFrame, concat } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 5;
const ITERATIONS = 20;

const df1 = DataFrame.fromColumns({
  a: Array.from({ length: ROWS }, (_, i) => i * 1.0),
  b: Array.from({ length: ROWS }, (_, i) => i * 2.0),
});
const df2 = DataFrame.fromColumns({
  c: Array.from({ length: ROWS }, (_, i) => i * 3.0),
  d: Array.from({ length: ROWS }, (_, i) => i * 4.0),
});

for (let i = 0; i < WARMUP; i++) concat([df1, df2], { axis: 1 });

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  concat([df1, df2], { axis: 1 });
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ function: "concat_axis1", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
