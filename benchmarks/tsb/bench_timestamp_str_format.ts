/**
 * Benchmark: Timestamp string formatting — strftime, isoformat, day_name, month_name.
 * Outputs JSON: {"function": "timestamp_str_format", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Timestamp } from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

const timestamps = Array.from(
  { length: SIZE },
  (_, i) => new Timestamp(Date.UTC(2020, i % 12, (i % 28) + 1, i % 24, i % 60, i % 60)),
);

for (let i = 0; i < WARMUP; i++) {
  for (const ts of timestamps) {
    ts.strftime("%Y-%m-%d %H:%M:%S");
    ts.isoformat();
    ts.day_name();
    ts.month_name();
  }
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  for (const ts of timestamps) {
    ts.strftime("%Y-%m-%d %H:%M:%S");
    ts.isoformat();
    ts.day_name();
    ts.month_name();
  }
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "timestamp_str_format",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
