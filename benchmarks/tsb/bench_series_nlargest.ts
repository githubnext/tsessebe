/**
 * Benchmark: nlargest on 100k-element Series (top 1000)
 */
import { Series, nlargestSeries } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Float64Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.01) * 1000);
const s = new Series(data);

for (let i = 0; i < WARMUP; i++) {
  nlargestSeries(s, 1000);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  nlargestSeries(s, 1000);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_nlargest",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
