/**
 * Benchmark: Series.min() and Series.max() on 100k numeric Series.
 */
import { Series } from "../../src/index.js";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => (i * 3.14) % 5000) });

for (let i = 0; i < WARMUP; i++) { s.min(); s.max(); }

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  s.min(); s.max();
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ function: "series_min_max", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
