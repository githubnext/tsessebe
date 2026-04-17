/**
 * Benchmark: valueCountsBinned — bin 100k values into intervals and count.
 * Outputs JSON: {"function": "value_counts_binned", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, valueCountsBinned } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const data = Array.from({ length: SIZE }, (_, i) => (i % 1000) * 0.1);
const s = new Series(data);

for (let i = 0; i < WARMUP; i++) {
  valueCountsBinned(s, 10);
  valueCountsBinned(s, 50);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  valueCountsBinned(s, 10);
  valueCountsBinned(s, 50);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "value_counts_binned",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
