/**
 * Benchmark: Series.count() — non-NA count on 100k Series with some NAs.
 */
import { Series } from "../../src/index.js";

const SIZE = 100_000;
const WARMUP = 10;
const ITERATIONS = 100;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => i % 5 === 0 ? null : i) });

for (let i = 0; i < WARMUP; i++) s.count();

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  s.count();
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ function: "series_count", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
