/**
 * Benchmark: IntervalIndex.fromArrays() and IntervalIndex.fromIntervals() — alternative constructors.
 * Outputs JSON: {"function": "interval_index_construction", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Interval, IntervalIndex } from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

// Prepare data for fromArrays
const leftArr = Array.from({ length: SIZE }, (_, i) => i * 0.1);
const rightArr = Array.from({ length: SIZE }, (_, i) => i * 0.1 + 0.1);

// Prepare interval objects for fromIntervals
const intervals = Array.from({ length: SIZE }, (_, i) => new Interval(i * 0.1, i * 0.1 + 0.1));

for (let i = 0; i < WARMUP; i++) {
  IntervalIndex.fromArrays(leftArr, rightArr);
  IntervalIndex.fromArrays(leftArr, rightArr, "left");
  IntervalIndex.fromIntervals(intervals);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  IntervalIndex.fromArrays(leftArr, rightArr);
  IntervalIndex.fromArrays(leftArr, rightArr, "left");
  IntervalIndex.fromIntervals(intervals);
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "interval_index_construction",
    mean_ms: meanMs,
    iterations: ITERATIONS,
    total_ms: totalMs,
  }),
);
