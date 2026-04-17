/**
 * Benchmark: TimedeltaIndex.toStrings(), .toArray(), .at(), .rename() on 10k-element index.
 * Outputs JSON: {"function": "timedelta_index_tostrings", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Timedelta, TimedeltaIndex } from "../../src/index.js";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

const deltas = Array.from({ length: SIZE }, (_, i) =>
  Timedelta.fromComponents({ days: i % 365, hours: i % 24, minutes: i % 60 }),
);
const idx = TimedeltaIndex.fromTimedeltas(deltas, "duration");

for (let i = 0; i < WARMUP; i++) {
  idx.toStrings();
  idx.toArray();
  idx.at(0);
  idx.at(SIZE - 1);
  idx.rename("elapsed");
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  idx.toStrings();
  idx.toArray();
  idx.at(0);
  idx.at(SIZE - 1);
  idx.rename("elapsed");
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "timedelta_index_tostrings",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
