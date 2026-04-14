/**
 * Benchmark: ewm std (alpha=0.1) on 100k-element Series
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Float64Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.01));
const s = new Series(data);

for (let i = 0; i < WARMUP; i++) {
  s.ewm({ alpha: 0.1 }).std();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.ewm({ alpha: 0.1 }).std();
}
const total = performance.now() - start;

console.log(JSON.stringify({ function: "ewm_std", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
