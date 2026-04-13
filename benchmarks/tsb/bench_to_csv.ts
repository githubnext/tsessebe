/**
 * Benchmark: DataFrame toCsv
 *
 * Serializes a large DataFrame to a CSV string.
 * Outputs JSON: {"function": "to_csv", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */

import { DataFrame, toCsv } from "../../src/index.ts";

const ROWS = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

function makeFrame(): DataFrame {
  return new DataFrame({
    data: {
      id: Array.from({ length: ROWS }, (_, i) => i),
      x: Array.from({ length: ROWS }, (_, i) => i * 1.1),
      y: Array.from({ length: ROWS }, (_, i) => i * 2.2),
      label: Array.from({ length: ROWS }, (_, i) => `item_${i % 100}`),
    },
  });
}

const df = makeFrame();

for (let i = 0; i < WARMUP; i++) {
  toCsv(df);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  toCsv(df);
  const end = performance.now();
  times.push(end - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;

console.log(JSON.stringify({
  function: "to_csv",
  mean_ms: Math.round(meanMs * 1000) / 1000,
  iterations: ITERATIONS,
  total_ms: Math.round(totalMs * 1000) / 1000,
}));
