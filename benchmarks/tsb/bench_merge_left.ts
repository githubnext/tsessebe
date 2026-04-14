/**
 * Benchmark: merge(left, right, { how: "left" }) on 50k-row DataFrames.
 */
import { DataFrame, merge } from "../../src/index.js";

const ROWS = 50_000;
const WARMUP = 3;
const ITERATIONS = 10;

const left = DataFrame.fromColumns({
  id: Array.from({ length: ROWS }, (_, i) => i),
  val: Array.from({ length: ROWS }, (_, i) => i * 1.5),
});
const right = DataFrame.fromColumns({
  id: Array.from({ length: ROWS }, (_, i) => i % (ROWS / 2)),
  extra: Array.from({ length: ROWS }, (_, i) => i * 2.0),
});

for (let i = 0; i < WARMUP; i++) merge(left, right, { on: "id", how: "left" });

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  merge(left, right, { on: "id", how: "left" });
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ function: "merge_left", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
