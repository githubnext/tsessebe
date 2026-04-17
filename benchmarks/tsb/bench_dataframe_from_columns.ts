/**
 * Benchmark: DataFrame.fromColumns() — construct a 100k-row DataFrame from column arrays.
 * Tests the performance of the most common DataFrame construction path.
 * Outputs JSON: {"function": "dataframe_from_columns", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

const colA = Array.from({ length: SIZE }, (_, i) => i * 1.0);
const colB = Array.from({ length: SIZE }, (_, i) => i * 2.5);
const colC = Array.from({ length: SIZE }, (_, i) => i % 1000);
const colD = Array.from({ length: SIZE }, (_, i) => Math.sin(i * 0.001));

for (let i = 0; i < WARMUP; i++) {
  DataFrame.fromColumns({ a: colA, b: colB, c: colC, d: colD });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  DataFrame.fromColumns({ a: colA, b: colB, c: colC, d: colD });
  times.push(performance.now() - t0);
}

const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "dataframe_from_columns",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
