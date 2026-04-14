/**
 * Benchmark: Series.quantile(q) on 100k numeric Series.
 */
import { Series } from "../../src/index.js";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 20;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => (i * 1.41) % 10000) });

for (let i = 0; i < WARMUP; i++) { s.quantile(0.25); s.quantile(0.75); }

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  s.quantile(0.25);
  s.quantile(0.75);
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ function: "series_quantile", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
