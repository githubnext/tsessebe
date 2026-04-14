/**
 * Benchmark: DataFrame correlation matrix on 10k-row x 5-column DataFrame
 */
import { DataFrame, dataFrameCorr } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 3;
const ITERATIONS = 10;

const df = new DataFrame({
  A: Float64Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.01)),
  B: Float64Array.from({ length: ROWS }, (_, i) => Math.cos(i * 0.01)),
  C: Float64Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.02)),
  D: Float64Array.from({ length: ROWS }, (_, i) => Math.cos(i * 0.02)),
  E: Float64Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.03)),
});

for (let i = 0; i < WARMUP; i++) {
  dataFrameCorr(df);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  dataFrameCorr(df);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_corr",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
