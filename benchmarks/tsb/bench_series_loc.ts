/**
 * Benchmark: Series.loc(labels[]) — label-based selection on 100k Series.
 */
import { Series, Index } from "../../src/index.js";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

const labels = Array.from({ length: SIZE }, (_, i) => i);
const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => i * 2.0), index: new Index(labels) });
const selectLabels = Array.from({ length: 1000 }, (_, i) => i * 100);

for (let i = 0; i < WARMUP; i++) s.loc(selectLabels);

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  s.loc(selectLabels);
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ function: "series_loc", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
