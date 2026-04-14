/**
 * Benchmark: toDictOriented (records orient) on 1000x5 DataFrame
 */
import { DataFrame, toDictOriented } from "../../src/index.js";

const ROWS = 1_000;
const WARMUP = 3;
const ITERATIONS = 20;

const df = new DataFrame({
  a: Float64Array.from({ length: ROWS }, (_, i) => i),
  b: Float64Array.from({ length: ROWS }, (_, i) => i * 2),
  c: Float64Array.from({ length: ROWS }, (_, i) => i * 3),
  d: Array.from({ length: ROWS }, (_, i) => `str${i}`),
  e: Float64Array.from({ length: ROWS }, (_, i) => i * 0.5),
});

for (let i = 0; i < WARMUP; i++) {
  toDictOriented(df, "records");
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  toDictOriented(df, "records");
}
const total = performance.now() - start;

console.log(JSON.stringify({ function: "to_dict_oriented", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
