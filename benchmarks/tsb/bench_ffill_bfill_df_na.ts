/**
 * Benchmark: dataFrameFfill / dataFrameBfill — forward/backward fill on 10k-row DataFrame.
 * Outputs JSON: {"function": "ffill_bfill_df_na", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, dataFrameFfill, dataFrameBfill } from "../../src/index.ts";

const ROWS = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

// ~10% null values in 5 numeric columns
const makeCol = (offset: number): (number | null)[] =>
  Array.from({ length: ROWS }, (_, i) => (i % 10 === 0 ? null : i + offset));

const df = DataFrame.fromColumns({
  a: makeCol(0),
  b: makeCol(1),
  c: makeCol(2),
  d: makeCol(3),
  e: makeCol(4),
});

for (let i = 0; i < WARMUP; i++) {
  dataFrameFfill(df);
  dataFrameBfill(df);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  dataFrameFfill(df);
  dataFrameBfill(df);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "ffill_bfill_df_na",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
