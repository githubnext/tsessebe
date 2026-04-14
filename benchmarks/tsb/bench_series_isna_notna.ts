/**
 * Benchmark: Series.isna() and Series.notna() on 100k Series with NAs.
 */
import { Series } from "../../src/index.js";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => i % 3 === 0 ? null : i * 1.0) });

for (let i = 0; i < WARMUP; i++) { s.isna(); s.notna(); }

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  s.isna();
  s.notna();
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ function: "series_isna_notna", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
