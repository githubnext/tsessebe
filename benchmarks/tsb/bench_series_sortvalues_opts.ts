/**
 * Benchmark: Series.sortValues with options — ascending=false, naPosition='first'.
 * Outputs JSON: {"function": "series_sortvalues_opts", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series } from "../../src/index.ts";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

const data = Array.from({ length: ROWS }, (_, i) => {
  if (i % 1000 === 0) return null;
  return Math.random() * 10000 - 5000;
});
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.sortValues(false);
  s.sortValues(true, "first");
  s.sortValues(false, "first");
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.sortValues(false);
  s.sortValues(true, "first");
  s.sortValues(false, "first");
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_sortvalues_opts",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
