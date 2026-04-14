/**
 * Benchmark: describe(s) — summary statistics function on 100k Series.
 */
import { Series, describe } from "../../src/index.js";

const SIZE = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => (i * 1.1) % 9999) });

for (let i = 0; i < WARMUP; i++) describe(s);

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  describe(s);
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ function: "series_describe", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
