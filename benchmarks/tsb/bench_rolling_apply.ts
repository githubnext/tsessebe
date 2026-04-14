/**
 * Benchmark: rollingApply on 10k-element Series
 */
import { Series, rollingApply } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 3;
const ITERATIONS = 10;
const data = Array.from({ length: ROWS }, (_, i) => i * 0.1);
const s = new Series({ data });
const mean = (window: number[]) => window.reduce((a, b) => a + b, 0) / window.length;

for (let i = 0; i < WARMUP; i++) rollingApply(s, 10, mean);
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) rollingApply(s, 10, mean);
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "rolling_apply",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
