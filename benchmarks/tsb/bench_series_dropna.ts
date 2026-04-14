/**
 * Benchmark: Series.dropna() on 100k Series with ~20% NAs.
 */
import { Series } from "../../src/index.js";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => i % 5 === 0 ? null : i * 1.0) });

for (let i = 0; i < WARMUP; i++) s.dropna();

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  s.dropna();
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ function: "series_dropna", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
