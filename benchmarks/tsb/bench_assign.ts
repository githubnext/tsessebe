/**
 * Benchmark: dataFrameAssign — add computed columns to a 100k-row DataFrame
 */
import { DataFrame, dataFrameAssign } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const df = DataFrame.fromColumns({
  a: Float64Array.from({ length: ROWS }, (_, i) => i),
  b: Float64Array.from({ length: ROWS }, (_, i) => i * 2),
});

for (let i = 0; i < WARMUP; i++) {
  dataFrameAssign(df, {
    c: (d: DataFrame) => d.col("a").add(d.col("b")),
  });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  dataFrameAssign(df, {
    c: (d: DataFrame) => d.col("a").add(d.col("b")),
  });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "assign",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
