/**
 * Benchmark: seriesTransform on 100k-element Series
 */
import { Series, seriesTransform } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;
const data = Array.from({ length: ROWS }, (_, i) => i * 0.1);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) seriesTransform(s, (v) => (v as number) ** 2);
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) seriesTransform(s, (v) => (v as number) ** 2);
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "series_transform",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
