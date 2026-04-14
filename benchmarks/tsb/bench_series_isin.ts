/**
 * Benchmark: Series.isin(values) on 100k Series with 100-element lookup set.
 */
import { Series } from "../../src/index.js";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => i % 500) });
const lookupSet = Array.from({ length: 100 }, (_, i) => i * 5);

for (let i = 0; i < WARMUP; i++) s.isin(lookupSet);

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  s.isin(lookupSet);
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ function: "series_isin", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
