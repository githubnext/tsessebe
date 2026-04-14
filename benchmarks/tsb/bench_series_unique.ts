/**
 * Benchmark: Series.unique() on 100k-element Series with 1000 distinct values.
 */
import { Series } from "../../src/index.js";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => i % 1000) });

for (let i = 0; i < WARMUP; i++) s.unique();

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  s.unique();
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ function: "series_unique", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
