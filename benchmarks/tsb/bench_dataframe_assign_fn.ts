/**
 * Benchmark: dataFrameAssign — add new columns to a DataFrame using the functional API.
 * Outputs JSON: {"function": "dataframe_assign_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { dataFrameAssign, DataFrame, Series } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const df = new DataFrame({
  a: Array.from({ length: SIZE }, (_, i) => i * 1.0),
  b: Array.from({ length: SIZE }, (_, i) => i * 2.0),
});
const colC = new Series({ data: Array.from({ length: SIZE }, (_, i) => i * 3.0), name: "c" });

for (let i = 0; i < WARMUP; i++) {
  dataFrameAssign(df, {
    c: colC,
    d: (working) => {
      const aVals = working.col("a").values;
      const cVals = working.col("c").values;
      return new Series({ data: aVals.map((v, idx) => (v as number) + (cVals[idx] as number)) });
    },
  });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  dataFrameAssign(df, {
    c: colC,
    d: (working) => {
      const aVals = working.col("a").values;
      const cVals = working.col("c").values;
      return new Series({ data: aVals.map((v, idx) => (v as number) + (cVals[idx] as number)) });
    },
  });
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "dataframe_assign_fn",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
