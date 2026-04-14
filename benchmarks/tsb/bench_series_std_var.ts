/**
 * Benchmark: Series.std() and Series.var() on 100k numeric Series.
 */
import { Series } from "../../src/index.js";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => (i * 2.71) % 10000) });

for (let i = 0; i < WARMUP; i++) { s.std(); s.var(); }

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  s.std(); s.var();
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ function: "series_std_var", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
