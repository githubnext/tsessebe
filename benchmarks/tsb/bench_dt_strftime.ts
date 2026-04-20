/**
 * Benchmark: dt_strftime — dt.strftime formatting on 100k datetime values.
 * Outputs JSON: {"function": "dt_strftime", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series } from "../../src/index.ts";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const now = Date.now();
const data = Array.from({ length: ROWS }, (_, i) => new Date(now + i * 60_000));
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.dt.strftime("%Y-%m-%d");
  s.dt.strftime("%H:%M:%S");
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.dt.strftime("%Y-%m-%d");
  s.dt.strftime("%H:%M:%S");
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dt_strftime",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
