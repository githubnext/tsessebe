/**
 * Benchmark: SeriesGroupBy.filter — keep groups matching a predicate.
 */
import { Series } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 3;
const ITERATIONS = 20;

const data = Array.from({ length: ROWS }, (_, i) => i * 1.0);
const by = new Series({ data: Array.from({ length: ROWS }, (_, i) => i % 100) });
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.groupby(by).filter((g) => (g.toArray() as number[]).reduce((a, b) => a + b, 0) > 1000);
}

const t0 = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.groupby(by).filter((g) => (g.toArray() as number[]).reduce((a, b) => a + b, 0) > 1000);
}
const total = performance.now() - t0;

console.log(
  JSON.stringify({ function: "series_groupby_filter", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }),
);
