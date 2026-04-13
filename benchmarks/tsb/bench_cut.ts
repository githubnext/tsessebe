/**
 * Benchmark: cut — bin 100k values into 10 equal-width bins
 */
import { Series, cut } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Array.from({ length: ROWS }, (_, i) => (i % 100) * 1.0);
const s = new Series(data);
const bins = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

for (let i = 0; i < WARMUP; i++) {
  cut(s, bins);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  cut(s, bins);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "cut",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
