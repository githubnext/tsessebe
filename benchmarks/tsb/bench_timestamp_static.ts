/**
 * Benchmark: Timestamp static constructors — fromComponents, fromisoformat, fromtimestamp, now, today.
 * Outputs JSON: {"function": "timestamp_static", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Timestamp } from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

const isoStrings = Array.from({ length: SIZE }, (_, i) => {
  const d = new Date(Date.UTC(2020, 0, 1) + i * 86_400_000);
  return d.toISOString();
});
const timestamps = Array.from({ length: SIZE }, (_, i) =>
  Date.UTC(2020, 0, 1) + i * 3_600_000,
);

for (let i = 0; i < WARMUP; i++) {
  for (let j = 0; j < SIZE; j++) {
    Timestamp.fromComponents({ year: 2020, month: (j % 12) + 1, day: (j % 28) + 1 });
    Timestamp.fromisoformat(isoStrings[j % isoStrings.length]);
    Timestamp.fromtimestamp(timestamps[j % timestamps.length]);
  }
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  for (let j = 0; j < SIZE; j++) {
    Timestamp.fromComponents({ year: 2020, month: (j % 12) + 1, day: (j % 28) + 1 });
    Timestamp.fromisoformat(isoStrings[j % isoStrings.length]);
    Timestamp.fromtimestamp(timestamps[j % timestamps.length]);
  }
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "timestamp_static",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
