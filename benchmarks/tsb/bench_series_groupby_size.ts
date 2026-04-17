/**
 * Benchmark: SeriesGroupBy.size() and SeriesGroupBy.getGroup() operations.
 * Outputs JSON: {"function": "series_groupby_size", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series } from "../../src/index.ts";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

const values = new Series({
  data: Array.from({ length: ROWS }, (_, i) => Math.random() * 1000),
});
const groups = new Series({
  data: Array.from({ length: ROWS }, (_, i) => `g${i % 20}`),
});

for (let i = 0; i < WARMUP; i++) {
  values.groupby(groups).size();
  values.groupby(groups).getGroup("g0");
  values.groupby(groups).getGroup("g10");
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  values.groupby(groups).size();
  values.groupby(groups).getGroup("g0");
  values.groupby(groups).getGroup("g10");
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_groupby_size",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
