/**
 * Benchmark: idxminDataFrame / idxmaxDataFrame — index of min/max per column.
 * Outputs JSON: {"function": "idxmin_max_df", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, idxminDataFrame, idxmaxDataFrame } from "../../src/index.ts";

const ROWS = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

const df = DataFrame.fromColumns({
  a: Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.001) * 100),
  b: Array.from({ length: ROWS }, (_, i) => (i % 100 === 0 ? null : i * 0.1)),
  c: Array.from({ length: ROWS }, (_, i) => (i % 2 === 0 ? i : -i) * 1.0),
});

for (let i = 0; i < WARMUP; i++) {
  idxminDataFrame(df);
  idxmaxDataFrame(df);
  idxminDataFrame(df, { skipna: false });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  idxminDataFrame(df);
  idxmaxDataFrame(df);
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "idxmin_max_df",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
