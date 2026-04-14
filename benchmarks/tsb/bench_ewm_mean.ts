/**
 * Benchmark: ewm_mean — exponentially weighted mean on 100k-element Series
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.05));
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.ewm({ span: 20 }).mean();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.ewm({ span: 20 }).mean();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "ewm_mean",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
