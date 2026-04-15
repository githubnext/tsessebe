/**
 * Benchmark: dt_date — DatetimeAccessor date() on 100k datetime values
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const now = Date.now();
const data = Array.from({ length: ROWS }, (_, i) => new Date(now + i * 86_400_000));
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.dt.date();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.dt.date();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dt_date",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
