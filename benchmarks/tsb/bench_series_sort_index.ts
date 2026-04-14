/**
 * Benchmark: Series.sortIndex() on 100k Series with string labels.
 */
import { Series, Index } from "../../src/index.js";

const SIZE = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const labels = Array.from({ length: SIZE }, (_, i) => `lbl_${(SIZE - i).toString().padStart(6, "0")}`);
const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => i), index: new Index(labels) });

for (let i = 0; i < WARMUP; i++) s.sortIndex();

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  s.sortIndex();
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ function: "series_sort_index", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
