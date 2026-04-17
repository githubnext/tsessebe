/**
 * Benchmark: whereDataFrame / maskDataFrame — standalone functional where/mask for DataFrame.
 * Outputs JSON: {"function": "where_mask_df_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, whereDataFrame, maskDataFrame } from "../../src/index.ts";

const ROWS = 100_000;
const WARMUP = 5;
const ITERATIONS = 20;

const df = DataFrame.fromColumns({
  a: Array.from({ length: ROWS }, (_, i) => i * 1.0),
  b: Array.from({ length: ROWS }, (_, i) => (i % 2 === 0 ? null : i * 0.5)),
  c: Array.from({ length: ROWS }, (_, i) => i * -1.0),
});

const condFn = (v: unknown) => (v as number) > 0;

for (let i = 0; i < WARMUP; i++) {
  whereDataFrame(df, condFn, { other: 0 });
  maskDataFrame(df, condFn, { other: -1 });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  whereDataFrame(df, condFn, { other: 0 });
  maskDataFrame(df, condFn, { other: -1 });
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "where_mask_df_fn",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
