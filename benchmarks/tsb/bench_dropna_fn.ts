/**
 * Benchmark: dropnaSeries / dropnaDataFrame — standalone functional dropna.
 * Outputs JSON: {"function": "dropna_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, dropnaSeries, dropnaDataFrame } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

// ~20% NaN values
const seriesData = Array.from({ length: SIZE }, (_, i) => (i % 5 === 0 ? null : i * 1.0));
const s = new Series({ data: seriesData });

const df = DataFrame.fromColumns({
  a: Array.from({ length: SIZE }, (_, i) => (i % 5 === 0 ? null : i * 0.1)),
  b: Array.from({ length: SIZE }, (_, i) => (i % 7 === 0 ? null : i * 2.0)),
  c: Array.from({ length: SIZE }, (_, i) => (i % 3 === 0 ? null : i % 100)),
});

for (let i = 0; i < WARMUP; i++) {
  dropnaSeries(s);
  dropnaDataFrame(df);
  dropnaDataFrame(df, { how: "any" });
  dropnaDataFrame(df, { how: "all" });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  dropnaSeries(s);
  dropnaDataFrame(df);
  dropnaDataFrame(df, { how: "any" });
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "dropna_fn",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
