/**
 * Benchmark: SeriesGroupBy.apply — apply a function to each group.
 */
import { Series } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 3;
const ITERATIONS = 20;

const data = Array.from({ length: ROWS }, (_, i) => i * 0.5);
const by = new Series({ data: Array.from({ length: ROWS }, (_, i) => i % 100) });
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.groupby(by).apply((g) => g);
}

const t0 = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.groupby(by).apply((g) => {
    const vals = g.toArray() as number[];
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    return new Series({ data: vals.map((v) => v - mean) });
  });
}
const total = performance.now() - t0;

console.log(
  JSON.stringify({ function: "series_groupby_apply", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }),
);
