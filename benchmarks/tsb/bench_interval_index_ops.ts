/**
 * Benchmark: IntervalIndex.contains / IntervalIndex.get_loc — interval index lookup ops on 1k-interval index.
 * Outputs JSON: {"function": "interval_index_ops", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { IntervalIndex } from "../../src/index.ts";

const BREAKS = 1_001; // 1000 intervals
const QUERIES = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

const breaks = Array.from({ length: BREAKS }, (_, i) => i * 0.1);
const idx = IntervalIndex.fromBreaks(breaks);

// Query values spread across the range
const queryValues = Array.from({ length: QUERIES }, (_, i) => (i / QUERIES) * (BREAKS - 1) * 0.1);

for (let i = 0; i < WARMUP; i++) {
  for (let q = 0; q < 100; q++) {
    idx.contains(queryValues[q]!);
    idx.get_loc(queryValues[q]!);
  }
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  for (let q = 0; q < QUERIES; q++) {
    idx.contains(queryValues[q]!);
    idx.get_loc(queryValues[q]!);
  }
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "interval_index_ops",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
