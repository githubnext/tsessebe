/**
 * Benchmark: Series.groupby(by).agg('sum') on 100k Series.
 */
import { Series } from "../../src/index.js";

const SIZE = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => (i * 1.5) % 9999) });
const by = new Series({ data: Array.from({ length: SIZE }, (_, i) => i % 100) });

for (let i = 0; i < WARMUP; i++) s.groupby(by).agg("sum");

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  s.groupby(by).agg("sum");
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ function: "series_groupby", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
