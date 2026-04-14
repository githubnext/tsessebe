/**
 * Benchmark: Series.filter(mask) — boolean selection on 100k Series.
 */
import { Series } from "../../src/index.js";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => i) });
const mask = new Series({ data: Array.from({ length: SIZE }, (_, i) => i % 2 === 0) });

for (let i = 0; i < WARMUP; i++) s.filter(mask);

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  s.filter(mask);
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ function: "series_filter", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
