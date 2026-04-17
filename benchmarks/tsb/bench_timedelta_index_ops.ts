/**
 * Benchmark: TimedeltaIndex.sort / unique / shift / filter / min / max — operations on 1k-element TimedeltaIndex.
 * Outputs JSON: {"function": "timedelta_index_ops", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Timedelta, TimedeltaIndex } from "../../src/index.ts";

const SIZE = 1_000;
const WARMUP = 5;
const ITERATIONS = 100;

// Shuffled, with some duplicates
const deltas = Array.from({ length: SIZE }, (_, i) =>
  Timedelta.fromComponents({ days: (i * 13) % 365, hours: i % 24 }),
);
const idx = TimedeltaIndex.fromTimedeltas(deltas);
const shiftBy = Timedelta.fromComponents({ days: 1 });
const threshold = Timedelta.fromComponents({ days: 100 });

for (let i = 0; i < WARMUP; i++) {
  idx.sort();
  idx.unique();
  idx.shift(shiftBy);
  idx.filter((td) => td.totalDays < threshold.totalDays);
  idx.min();
  idx.max();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  idx.sort();
  idx.unique();
  idx.shift(shiftBy);
  idx.filter((td) => td.totalDays < threshold.totalDays);
  idx.min();
  idx.max();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "timedelta_index_ops",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
