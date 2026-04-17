/**
 * Benchmark: Timestamp rounding — ceil, floor, round, normalize.
 * Outputs JSON: {"function": "timestamp_round_normalize", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Timestamp } from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

const timestamps = Array.from(
  { length: SIZE },
  (_, i) =>
    new Timestamp(Date.UTC(2020, i % 12, (i % 28) + 1, i % 24, (i * 7) % 60, (i * 13) % 60)),
);

for (let i = 0; i < WARMUP; i++) {
  for (const ts of timestamps) {
    ts.floor("H");
    ts.ceil("H");
    ts.round("T");
    ts.normalize();
  }
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  for (const ts of timestamps) {
    ts.floor("H");
    ts.ceil("H");
    ts.round("T");
    ts.normalize();
  }
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "timestamp_round_normalize",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
