/**
 * Benchmark: MultiIndex.fromTuples — construct a MultiIndex from an array of tuples.
 * Outputs JSON: {"function": "multi_index_fromtuples", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { MultiIndex } from "../../src/index.ts";

const SIZE = 5_000;
const WARMUP = 3;
const ITERATIONS = 20;

// Build an array of 2-level tuples [string, number]
const tuples: (readonly (string | number)[])[] = Array.from({ length: SIZE }, (_, i) => [
  `dept_${i % 20}`,
  i % 100,
]);

// Also build 3-level tuples to test deeper nesting
const tuples3: (readonly (string | number)[])[] = Array.from({ length: SIZE }, (_, i) => [
  `region_${i % 5}`,
  `dept_${i % 20}`,
  i % 50,
]);

for (let i = 0; i < WARMUP; i++) {
  MultiIndex.fromTuples(tuples);
  MultiIndex.fromTuples(tuples3);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  MultiIndex.fromTuples(tuples);
  MultiIndex.fromTuples(tuples3);
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "multi_index_fromtuples",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
