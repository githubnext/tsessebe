/**
 * Benchmark: str_zfill_center_ljust_rjust — padding operations on 100k strings
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Array.from({ length: ROWS }, (_, i) => `${i}`);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.str.zfill(10);
  s.str.center(10);
  s.str.ljust(10);
  s.str.rjust(10);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.str.zfill(10);
  s.str.center(10);
  s.str.ljust(10);
  s.str.rjust(10);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "str_zfill_center_ljust_rjust",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
