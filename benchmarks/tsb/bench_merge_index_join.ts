/**
 * Benchmark: merge with left_index / right_index options on 10k-row DataFrames.
 * Outputs JSON: {"function": "merge_index_join", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, merge } from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 30;

const left = DataFrame.fromColumns({
  val_a: Array.from({ length: SIZE }, (_, i) => i * 1.5),
});
const right = DataFrame.fromColumns({
  val_b: Array.from({ length: SIZE }, (_, i) => i * 2.0),
});

for (let i = 0; i < WARMUP; i++) {
  merge(left, right, { left_index: true, right_index: true, how: "inner" });
  merge(left, right, { left_index: true, right_index: true, how: "outer" });
  merge(left, right, { left_index: true, right_index: true, how: "left" });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  merge(left, right, { left_index: true, right_index: true, how: "inner" });
  merge(left, right, { left_index: true, right_index: true, how: "outer" });
  merge(left, right, { left_index: true, right_index: true, how: "left" });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "merge_index_join",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
