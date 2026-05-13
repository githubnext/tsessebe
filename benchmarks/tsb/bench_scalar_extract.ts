/**
 * Benchmark: scalar extraction utilities (squeeze, firstValidIndex, lastValidIndex) on 100k rows
 */
import { DataFrame, Index, Series, squeezeSeries, squeezeDataFrame, firstValidIndex, lastValidIndex, dataFrameFirstValidIndex, dataFrameLastValidIndex } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

// Series with some leading/trailing nulls
const data: (number | null)[] = Array.from({ length: ROWS }, (_, i) =>
  i < 100 || i >= ROWS - 100 ? null : i * 0.1,
);
const s = new Series(data);
const s1 = new Series([42]);

// DataFrame with some nulls
const colA: (number | null)[] = Array.from({ length: ROWS }, (_, i) => (i < 50 ? null : i * 1.0));
const colB: (number | null)[] = Array.from({ length: ROWS }, (_, i) =>
  i >= ROWS - 50 ? null : i * 2.0,
);
const df = new DataFrame({ A: colA, B: colB });
const df1col = new DataFrame({ A: colA });

// Warm up
for (let i = 0; i < WARMUP; i++) {
  firstValidIndex(s);
  lastValidIndex(s);
  dataFrameFirstValidIndex(df);
  dataFrameLastValidIndex(df);
  squeezeSeries(s1);
  squeezeDataFrame(df1col, 1);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  firstValidIndex(s);
  lastValidIndex(s);
  dataFrameFirstValidIndex(df);
  dataFrameLastValidIndex(df);
  squeezeSeries(s1);
  squeezeDataFrame(df1col, 1);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "scalar_extract",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
