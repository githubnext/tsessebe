/**
 * Benchmark: fillna on Series and DataFrame (scalar, ffill, bfill)
 */
import { Series, DataFrame, fillnaSeries, fillnaDataFrame } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const seriesData = Float64Array.from({ length: ROWS }, (_, i) =>
  i % 10 === 0 ? NaN : i * 1.1,
);
const s = new Series(seriesData);

const colA = Float64Array.from({ length: ROWS }, (_, i) => (i % 7 === 0 ? NaN : i * 0.5));
const colB = Float64Array.from({ length: ROWS }, (_, i) => (i % 11 === 0 ? NaN : i * 1.5));
const df = DataFrame.fromColumns({ a: colA, b: colB });

for (let i = 0; i < WARMUP; i++) {
  fillnaSeries(s, { value: 0 });
  fillnaSeries(s, { method: "ffill" });
  fillnaDataFrame(df, { value: 0 });
  fillnaDataFrame(df, { method: "bfill" });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  fillnaSeries(s, { value: 0 });
  fillnaSeries(s, { method: "ffill" });
  fillnaDataFrame(df, { value: 0 });
  fillnaDataFrame(df, { method: "bfill" });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "fillna",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
