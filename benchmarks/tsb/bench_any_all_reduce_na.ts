/**
 * Benchmark: anySeries / allSeries / anyDataFrame / allDataFrame — boolean reductions.
 * Outputs JSON: {"function": "any_all_reduce_na", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import {
  Series,
  DataFrame,
  anySeries,
  allSeries,
  anyDataFrame,
  allDataFrame,
} from "../../src/index.ts";

const SIZE = 100_000;
const ROWS = 10_000;
const WARMUP = 5;
const ITERATIONS = 100;

const boolData = Array.from({ length: SIZE }, (_, i) => i % 3 !== 0);
const s = new Series({ data: boolData });
const df = DataFrame.fromColumns({
  a: Array.from({ length: ROWS }, (_, i) => i % 2 === 0),
  b: Array.from({ length: ROWS }, (_, i) => i > ROWS / 2),
  c: Array.from({ length: ROWS }, () => true),
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
    function: "any_all_reduce_na",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
