/**
 * Benchmark: Timestamp arithmetic — add, sub, comparison operators (eq/lt/gt/le/ge/ne).
 * Outputs JSON: {"function": "timestamp_arith", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Timestamp, Timedelta } from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

const base = new Timestamp(Date.UTC(2024, 0, 1));
const timestamps = Array.from(
  { length: SIZE },
  (_, i) => new Timestamp(Date.UTC(2020, 0, 1) + i * 86_400_000),
);
const delta = Timedelta.fromComponents({ days: 30 });
const delta2 = Timedelta.fromComponents({ hours: 12 });

for (let i = 0; i < WARMUP; i++) {
  for (const ts of timestamps) {
    ts.add(delta);
    ts.sub(delta2);
    ts.eq(base);
    ts.lt(base);
    ts.gt(base);
    ts.le(base);
    ts.ge(base);
    ts.ne(base);
  }
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  for (const ts of timestamps) {
    ts.add(delta);
    ts.sub(delta2);
    ts.eq(base);
    ts.lt(base);
    ts.gt(base);
    ts.le(base);
    ts.ge(base);
    ts.ne(base);
  }
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "timestamp_arith",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
