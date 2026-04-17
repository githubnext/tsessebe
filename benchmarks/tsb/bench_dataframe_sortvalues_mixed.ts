/**
 * Benchmark: DataFrame.sortValues with mixed ascending array [true, false, true].
 * Outputs JSON: {"function": "dataframe_sortvalues_mixed", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame } from "../../src/index.ts";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

const df = DataFrame.fromColumns({
  category: Array.from({ length: ROWS }, (_, i) => `group_${i % 10}`),
  priority: Array.from({ length: ROWS }, (_, i) => i % 5),
  value: Array.from({ length: ROWS }, () => Math.random() * 1000),
});

for (let i = 0; i < WARMUP; i++) {
  df.sortValues(["category", "priority", "value"], [true, false, true]);
  df.sortValues(["category", "value"], [false, true]);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  df.sortValues(["category", "priority", "value"], [true, false, true]);
  df.sortValues(["category", "value"], [false, true]);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_sortvalues_mixed",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
