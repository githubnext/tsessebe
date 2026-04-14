/**
 * Benchmark: Series.sum() and Series.mean() on 100k numeric Series.
 */
import { Series } from "../../src/index.js";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => i * 0.001) });

for (let i = 0; i < WARMUP; i++) { s.sum(); s.mean(); }

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  s.sum(); s.mean();
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ function: "series_sum_mean", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
