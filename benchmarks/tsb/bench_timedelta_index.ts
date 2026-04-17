/**
 * Benchmark: TimedeltaIndex.fromTimedeltas / fromRange / fromStrings — TimedeltaIndex construction.
 * Outputs JSON: {"function": "timedelta_index", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Timedelta, TimedeltaIndex } from "../../src/index.ts";

const SIZE = 1_000;
const WARMUP = 5;
const ITERATIONS = 100;

const deltas = Array.from({ length: SIZE }, (_, i) =>
  Timedelta.fromComponents({ days: i, hours: i % 24 }),
);
const startTd = Timedelta.fromComponents({ days: 0 });
const stopTd = Timedelta.fromComponents({ days: SIZE });
const stepTd = Timedelta.fromComponents({ days: 1 });
const strings = Array.from({ length: SIZE }, (_, i) => `${i}D`);

for (let i = 0; i < WARMUP; i++) {
  TimedeltaIndex.fromTimedeltas(deltas);
  TimedeltaIndex.fromRange(startTd, stopTd, stepTd);
  TimedeltaIndex.fromStrings(strings);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  TimedeltaIndex.fromTimedeltas(deltas);
  TimedeltaIndex.fromRange(startTd, stopTd, stepTd);
  TimedeltaIndex.fromStrings(strings);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "timedelta_index",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
