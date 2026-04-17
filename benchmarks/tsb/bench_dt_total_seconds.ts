/**
 * Benchmark: DatetimeAccessor.total_seconds — epoch-second conversion on 100k datetime Series.
 * Outputs JSON: {"function": "dt_total_seconds", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const base = new Date("2020-01-01T00:00:00Z").getTime();
const dates = Array.from({ length: SIZE }, (_, i) => new Date(base + i * 60_000));
const s = new Series({ data: dates });

for (let i = 0; i < WARMUP; i++) {
  s.dt.total_seconds();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.dt.total_seconds();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dt_total_seconds",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
