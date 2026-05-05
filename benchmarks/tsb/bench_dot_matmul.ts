/**
 * Benchmark: seriesDotSeries and dataFrameDotDataFrame
 */
import { Series, DataFrame, seriesDotSeries, dataFrameDotDataFrame } from "../../src/index.js";

const N = 1_000;
const K = 10;
const WARMUP = 3;
const ITERATIONS = 10;

const a = Float64Array.from({ length: N }, (_, i) => i * 0.1);
const b = Float64Array.from({ length: N }, (_, i) => (N - i) * 0.2);
const sa = new Series(a);
const sb = new Series(b);

// dfA: N rows × K columns (colnames 0..K-1)
// dfB: K rows (index 0..K-1) × K columns — so left.columns aligns with right.index
const colsA: Record<string, Float64Array> = {};
for (let c = 0; c < K; c++) {
  colsA[String(c)] = Float64Array.from({ length: N }, (_, i) => (i + c) * 0.01);
}
const dfA = DataFrame.fromColumns(colsA);

const colsB: Record<string, number[]> = {};
for (let c = 0; c < K; c++) {
  colsB[String(c)] = Array.from({ length: K }, (_, i) => (i * K + c) * 0.1);
}
const dfB = DataFrame.fromColumns(colsB);

for (let i = 0; i < WARMUP; i++) {
  seriesDotSeries(sa, sb);
  dataFrameDotDataFrame(dfA, dfB);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  seriesDotSeries(sa, sb);
  dataFrameDotDataFrame(dfA, dfB);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dot_matmul",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
