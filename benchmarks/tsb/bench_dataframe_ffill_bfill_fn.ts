/**
 * Benchmark: dataFrameFfill / dataFrameBfill — standalone DataFrame forward/backward fill.
 * Mirrors pandas DataFrame.ffill() / DataFrame.bfill().
 * Outputs JSON: {"function": "dataframe_ffill_bfill_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, dataFrameFfill, dataFrameBfill } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 20;

const df = DataFrame.fromColumns({
  a: Array.from({ length: SIZE }, (_, i) => (i % 5 === 0 ? null : i * 0.1)),
  b: Array.from({ length: SIZE }, (_, i) => (i % 7 === 0 ? null : i * 2.0)),
  c: Array.from({ length: SIZE }, (_, i) => (i % 3 === 0 ? null : i * 0.5)),
});

for (let i = 0; i < WARMUP; i++) {
  dataFrameFfill(df);
  dataFrameBfill(df);
  dataFrameFfill(df, { limit: 3 });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  dataFrameFfill(df);
  dataFrameBfill(df);
  dataFrameFfill(df, { limit: 3 });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_ffill_bfill_fn",
    mean_ms: Math.round((total / ITERATIONS) * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(total * 1000) / 1000,
  }),
);
