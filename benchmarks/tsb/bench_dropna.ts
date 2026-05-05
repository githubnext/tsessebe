/**
 * Benchmark: dropna on Series and DataFrame (axis=0 and axis=1)
 */
import { Series, DataFrame, dropna, dropnaDataFrame } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

// ~10% missing values
const seriesData = Float64Array.from({ length: ROWS }, (_, i) =>
  i % 10 === 0 ? NaN : i * 1.1,
);
const s = new Series(seriesData);

const colA = Float64Array.from({ length: ROWS }, (_, i) => (i % 7 === 0 ? NaN : i * 0.5));
const colB = Float64Array.from({ length: ROWS }, (_, i) => (i % 11 === 0 ? NaN : i * 1.5));
const colC = Float64Array.from({ length: ROWS }, (_, i) => (i % 13 === 0 ? NaN : i * 2.0));
const df = DataFrame.fromColumns({ a: colA, b: colB, c: colC });

for (let i = 0; i < WARMUP; i++) {
  dropna(s);
  dropnaDataFrame(df, { how: "any" });
  dropnaDataFrame(df, { how: "all" });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  dropna(s);
  dropnaDataFrame(df, { how: "any" });
  dropnaDataFrame(df, { how: "all" });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dropna",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
