/**
 * Benchmark: Series.copy() on 100k Series.
 */
import { Series } from "../../src/index.js";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => i * 0.5), name: "original" });

for (let i = 0; i < WARMUP; i++) s.copy();

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  s.copy();
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ function: "series_copy", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
