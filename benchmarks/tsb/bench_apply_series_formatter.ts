/**
 * Benchmark: applySeriesFormatter on 100k-element numeric Series
 */
import { Series, applySeriesFormatter, formatFloat } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;
const data = Array.from({ length: ROWS }, (_, i) => i * 1.234);
const s = new Series({ data });
const fmt = formatFloat(2);

for (let i = 0; i < WARMUP; i++) applySeriesFormatter(s, fmt);
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) applySeriesFormatter(s, fmt);
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "apply_series_formatter",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
