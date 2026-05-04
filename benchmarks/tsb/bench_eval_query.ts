/**
 * Benchmark: queryDataFrame and evalDataFrame on a 100k-row DataFrame
 */
import { DataFrame, queryDataFrame, evalDataFrame } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const df = DataFrame.fromColumns({
  a: Float64Array.from({ length: ROWS }, (_, i) => i * 0.5),
  b: Float64Array.from({ length: ROWS }, (_, i) => (ROWS - i) * 0.3),
  c: Float64Array.from({ length: ROWS }, (_, i) => (i % 100) * 1.0),
});

for (let i = 0; i < WARMUP; i++) {
  queryDataFrame(df, "a > 10000 and b < 20000");
  evalDataFrame(df, "a + b * 2");
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  queryDataFrame(df, "a > 10000 and b < 20000");
  evalDataFrame(df, "a + b * 2");
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "eval_query",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
