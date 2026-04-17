/**
 * Benchmark: stack with dropna=false option — includes null values in the output
 * on a 2k-row x 5-column DataFrame (100k total cells including nulls).
 * Outputs JSON: {"function": "stack_options", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, stack } from "../../src/index.ts";

const ROWS = 2_000;
const WARMUP = 5;
const ITERATIONS = 30;

// Create a DataFrame with some null values (every 10th element is null)
const makeCol = (mul: number) =>
  Array.from({ length: ROWS }, (_, i) => (i % 10 === 0 ? null : i * mul));

const df = DataFrame.fromColumns({
  a: makeCol(1.0),
  b: makeCol(1.1),
  c: makeCol(1.2),
  d: makeCol(1.3),
  e: makeCol(1.4),
});

for (let i = 0; i < WARMUP; i++) {
  stack(df, { dropna: true });
  stack(df, { dropna: false });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  stack(df, { dropna: true });
  stack(df, { dropna: false });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "stack_options",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
