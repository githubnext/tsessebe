/**
 * Benchmark: dt_dayofyear_weekday — DatetimeAccessor dayofyear, weekday on 100k values
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const now = Date.now();
const data = Array.from({ length: ROWS }, (_, i) => new Date(now + i * 86_400_000));
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.dt.dayofyear();
  s.dt.weekday();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.dt.dayofyear();
  s.dt.weekday();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dt_dayofyear_weekday",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
