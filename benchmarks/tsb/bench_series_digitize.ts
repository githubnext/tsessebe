/**
 * Benchmark: seriesDigitize on 100k-element Series
 */
import { Series, seriesDigitize } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;
const data = Array.from({ length: ROWS }, (_, i) => i * 0.001);
const s = new Series({ data });
const bins = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

for (let i = 0; i < WARMUP; i++) seriesDigitize(s, bins);
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) seriesDigitize(s, bins);
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "series_digitize",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
