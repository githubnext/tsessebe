/**
 * Benchmark: Series.setIndex() and Series.resetIndex() — reassign or reset the
 * row-index of a 100k-element Series.
 * Outputs JSON: {"function": "series_set_reset_index", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Index, Series } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const data = Array.from({ length: SIZE }, (_, i) => i * 1.5);
const s = new Series({ data });
const newIndex = new Index<number>(Array.from({ length: SIZE }, (_, i) => i * 2));

for (let i = 0; i < WARMUP; i++) {
  s.setIndex(newIndex);
  s.resetIndex();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.setIndex(newIndex);
  s.resetIndex();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_set_reset_index",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
