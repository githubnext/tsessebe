/**
 * Benchmark: modeDataFrame — standalone functional mode for DataFrame columns.
 * Outputs JSON: {"function": "mode_dataframe_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, modeDataFrame } from "../../src/index.ts";

const ROWS = 10_000;
const WARMUP = 5;
const ITERATIONS = 20;

// Low-cardinality numeric data (many ties → large mode arrays)
const df = DataFrame.fromColumns({
  a: Array.from({ length: ROWS }, (_, i) => i % 10),
  b: Array.from({ length: ROWS }, (_, i) => (i % 50 === 0 ? null : i % 5)),
  c: Array.from({ length: ROWS }, (_, i) => (i % 3)),
});

for (let i = 0; i < WARMUP; i++) {
  modeDataFrame(df);
  modeDataFrame(df, { dropna: false });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  modeDataFrame(df);
  modeDataFrame(df, { dropna: false });
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "mode_dataframe_fn",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
