/**
 * Benchmark: merge with sort=true — sort result by join-key values on 50k-row DataFrames.
 * Outputs JSON: {"function": "merge_sort", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, merge } from "../../src/index.ts";

const ROWS = 50_000;
const WARMUP = 3;
const ITERATIONS = 20;

const left = DataFrame.fromColumns({
  id: Array.from({ length: ROWS }, (_, i) => i % (ROWS / 2)),
  val_l: Array.from({ length: ROWS }, (_, i) => i * 1.5),
});

const right = DataFrame.fromColumns({
  id: Array.from({ length: ROWS / 2 }, (_, i) => i),
  val_r: Array.from({ length: ROWS / 2 }, (_, i) => i * 2.0),
});

for (let i = 0; i < WARMUP; i++) {
  merge(left, right, { on: "id", how: "inner", sort: true });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  merge(left, right, { on: "id", how: "inner", sort: true });
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;

console.log(
  JSON.stringify({
    function: "merge_sort",
    mean_ms: meanMs,
    iterations: ITERATIONS,
    total_ms: totalMs,
  }),
);
