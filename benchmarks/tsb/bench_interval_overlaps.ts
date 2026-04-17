/**
 * Benchmark: Interval.overlaps / IntervalIndex.overlaps — interval overlap checks on 1k intervals.
 * Outputs JSON: {"function": "interval_overlaps", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Interval, IntervalIndex } from "../../src/index.ts";

const SIZE = 1_000;
const WARMUP = 5;
const ITERATIONS = 50;

// Overlapping intervals: each spans 2 units, starting at every integer
const intervals = Array.from({ length: SIZE }, (_, i) => new Interval(i, i + 2));
const breaks = Array.from({ length: SIZE + 1 }, (_, i) => i);
const idx = IntervalIndex.fromBreaks(breaks);
const query = new Interval(250, 750);

for (let i = 0; i < WARMUP; i++) {
  for (const iv of intervals.slice(0, 50)) {
    iv.overlaps(query);
  }
  idx.overlaps(query);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  for (const iv of intervals) {
    iv.overlaps(query);
  }
  idx.overlaps(query);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "interval_overlaps",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
