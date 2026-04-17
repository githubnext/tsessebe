/**
 * Benchmark: concat with join="inner" and ignoreIndex=true options.
 * Outputs JSON: {"function": "concat_options", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, concat } from "../../src/index.ts";

const ROWS = 50_000;
const WARMUP = 5;
const ITERATIONS = 20;

// Two DataFrames with partial column overlap (inner join drops non-shared columns)
const df1 = DataFrame.fromColumns({
  a: Array.from({ length: ROWS }, (_, i) => i * 1.0),
  b: Array.from({ length: ROWS }, (_, i) => i * 2.0),
  c: Array.from({ length: ROWS }, (_, i) => i * 3.0),
});
const df2 = DataFrame.fromColumns({
  a: Array.from({ length: ROWS }, (_, i) => i * 1.5),
  b: Array.from({ length: ROWS }, (_, i) => i * 2.5),
  d: Array.from({ length: ROWS }, (_, i) => i * 4.0),
});

for (let i = 0; i < WARMUP; i++) {
  concat([df1, df2], { join: "inner", ignoreIndex: true });
  concat([df1, df2], { join: "outer", ignoreIndex: true });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  concat([df1, df2], { join: "inner", ignoreIndex: true });
  concat([df1, df2], { join: "outer", ignoreIndex: true });
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "concat_options",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
