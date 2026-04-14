/**
 * Benchmark: seriesApply on 100k-element Series
 */
import { Series, seriesApply } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;
const data = Array.from({ length: ROWS }, (_, i) => i * 0.1);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) seriesApply(s, (v) => (v as number) * 2 + 1);
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) seriesApply(s, (v) => (v as number) * 2 + 1);
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "series_apply",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
