/**
 * Benchmark: dt_is_quarter_start_end — is_quarter_start, is_quarter_end on 100k datetime values
 */
import { Series } from "../../src/index.ts";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const now = new Date("2024-01-01").getTime();
const data = Array.from({ length: ROWS }, (_, i) => new Date(now + i * 24 * 3600 * 1000));
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.dt.is_quarter_start();
  s.dt.is_quarter_end();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.dt.is_quarter_start();
  s.dt.is_quarter_end();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dt_is_quarter_start_end",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
