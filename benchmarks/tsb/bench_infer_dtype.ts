/**
 * Benchmark: inferDtype — infer dominant type from 100k-element array.
 * Outputs JSON: {"function": "infer_dtype", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { inferDtype } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const intArr = Array.from({ length: SIZE }, (_, i) => i);
const floatArr = Array.from({ length: SIZE }, (_, i) => i * 0.5);
const strArr = Array.from({ length: SIZE }, (_, i) => `val_${i}`);
const mixedArr = Array.from({ length: SIZE }, (_, i) => (i % 3 === 0 ? `s${i}` : i));

for (let i = 0; i < WARMUP; i++) {
  inferDtype(intArr);
  inferDtype(floatArr);
  inferDtype(strArr);
  inferDtype(mixedArr);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  inferDtype(intArr);
  inferDtype(floatArr);
  inferDtype(strArr);
  inferDtype(mixedArr);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "infer_dtype",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
