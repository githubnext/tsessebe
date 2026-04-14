/**
 * Benchmark: stack on 1000x5 DataFrame
 */
import { DataFrame, stack } from "../../src/index.js";

const ROWS = 1_000;
const WARMUP = 3;
const ITERATIONS = 20;

const df = new DataFrame({
  a: Float64Array.from({ length: ROWS }, (_, i) => i),
  b: Float64Array.from({ length: ROWS }, (_, i) => i * 2),
  c: Float64Array.from({ length: ROWS }, (_, i) => i * 3),
  d: Float64Array.from({ length: ROWS }, (_, i) => i * 4),
  e: Float64Array.from({ length: ROWS }, (_, i) => i * 5),
});

for (let i = 0; i < WARMUP; i++) {
  stack(df);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  stack(df);
}
const total = performance.now() - start;

console.log(JSON.stringify({ function: "stack", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
