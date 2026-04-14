/**
 * Benchmark: Series.corr(other) Pearson correlation on 100k-element Series.
 */
import { Series } from "../../src/index.js";

const SIZE = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

const a = new Series({ data: Array.from({ length: SIZE }, (_, i) => i * 0.1) });
const b = new Series({ data: Array.from({ length: SIZE }, (_, i) => i * 0.2 + Math.random()) });

for (let i = 0; i < WARMUP; i++) a.corr(b);

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  a.corr(b);
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ function: "series_corr", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
