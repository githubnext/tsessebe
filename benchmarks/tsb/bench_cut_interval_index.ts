/**
 * Benchmark: cutIntervalIndex / qcutIntervalIndex — cut/qcut returning IntervalIndex on 100k-element Series.
 * Outputs JSON: {"function": "cut_interval_index", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, cutIntervalIndex, qcutIntervalIndex } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

const data = Array.from({ length: SIZE }, (_, i) => (i % 1000) * 0.1);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  cutIntervalIndex(s, 20);
  qcutIntervalIndex(s, 10);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  cutIntervalIndex(s, 20);
  qcutIntervalIndex(s, 10);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "cut_interval_index",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
