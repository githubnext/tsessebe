/**
 * Benchmark: Series.resetIndex() on 100k Series.
 */
import { Series, Index } from "../../src/index.js";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

const labels = Array.from({ length: SIZE }, (_, i) => `key_${i}`);
const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => i), index: new Index(labels) });

for (let i = 0; i < WARMUP; i++) s.resetIndex();

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  s.resetIndex();
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ function: "series_resetindex", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
