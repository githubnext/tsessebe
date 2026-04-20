/**
 * Benchmark: any_all — anySeries / allSeries / anyDataFrame / allDataFrame on 100k rows.
 * Outputs JSON: {"function": "any_all", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, anySeries, allSeries, anyDataFrame, allDataFrame } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => i % 2 === 0) });
const df = DataFrame.fromColumns({
  a: Array.from({ length: SIZE }, (_, i) => i % 3 !== 0),
  b: Array.from({ length: SIZE }, (_, i) => i > 0),
  c: Array.from({ length: SIZE }, () => true),
});

for (let i = 0; i < WARMUP; i++) {
  anySeries(s);
  allSeries(s);
  anyDataFrame(df);
  allDataFrame(df);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  anySeries(s);
  allSeries(s);
  anyDataFrame(df);
  allDataFrame(df);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "any_all",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
