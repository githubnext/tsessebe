/**
 * Benchmark: alignDataFrame — align two 10k-row DataFrames on inner/outer join.
 * Outputs JSON: {"function": "align_dataframe", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, Index, alignDataFrame } from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 30;

const idxA = Array.from({ length: SIZE }, (_, i) => i * 2);
const idxB = Array.from({ length: SIZE }, (_, i) => i * 3);

const dfA = new DataFrame(
  {
    x: Array.from({ length: SIZE }, (_, i) => i * 1.0),
    y: Array.from({ length: SIZE }, (_, i) => i * 2.0),
    z: Array.from({ length: SIZE }, (_, i) => i * 3.0),
  },
  { index: new Index(idxA) },
);

const dfB = new DataFrame(
  {
    y: Array.from({ length: SIZE }, (_, i) => i * 10.0),
    z: Array.from({ length: SIZE }, (_, i) => i * 20.0),
    w: Array.from({ length: SIZE }, (_, i) => i * 30.0),
  },
  { index: new Index(idxB) },
);

for (let i = 0; i < WARMUP; i++) {
  alignDataFrame(dfA, dfB, { join: "inner" });
  alignDataFrame(dfA, dfB, { join: "outer" });
  alignDataFrame(dfA, dfB, { join: "left" });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  alignDataFrame(dfA, dfB, { join: "inner" });
  alignDataFrame(dfA, dfB, { join: "outer" });
  alignDataFrame(dfA, dfB, { join: "left" });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "align_dataframe",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
