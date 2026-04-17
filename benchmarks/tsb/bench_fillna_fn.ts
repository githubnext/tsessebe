/**
 * Benchmark: fillnaSeries / fillnaDataFrame — standalone functional fillna.
 * Outputs JSON: {"function": "fillna_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, fillnaSeries, fillnaDataFrame } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

// ~20% NaN values
const seriesData = Array.from({ length: SIZE }, (_, i) => (i % 5 === 0 ? null : i * 1.0));
const s = new Series({ data: seriesData });

const df = DataFrame.fromColumns({
  a: Array.from({ length: SIZE }, (_, i) => (i % 5 === 0 ? null : i * 0.1)),
  b: Array.from({ length: SIZE }, (_, i) => (i % 7 === 0 ? null : i * 2.0)),
  c: Array.from({ length: SIZE }, (_, i) => (i % 3 === 0 ? null : "cat" + (i % 10))),
});

for (let i = 0; i < WARMUP; i++) {
  fillnaSeries(s, { value: 0 });
  fillnaSeries(s, { method: "ffill" });
  fillnaDataFrame(df, { value: 0 });
  fillnaDataFrame(df, { method: "bfill" });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  fillnaSeries(s, { value: 0 });
  fillnaSeries(s, { method: "ffill" });
  fillnaDataFrame(df, { value: 0 });
  fillnaDataFrame(df, { method: "bfill" });
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "fillna_fn",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
