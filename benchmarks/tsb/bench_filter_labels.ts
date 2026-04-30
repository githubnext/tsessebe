/**
 * Benchmark: filterDataFrame by items and regex on 100k-row DataFrame
 */
import { DataFrame, filterDataFrame } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const df = DataFrame.fromColumns({
  alpha: Float64Array.from({ length: ROWS }, (_, i) => i),
  beta: Float64Array.from({ length: ROWS }, (_, i) => i * 2),
  gamma: Float64Array.from({ length: ROWS }, (_, i) => i * 3),
  delta: Float64Array.from({ length: ROWS }, (_, i) => i * 4),
  epsilon: Float64Array.from({ length: ROWS }, (_, i) => i * 5),
});

// Filter by items
for (let i = 0; i < WARMUP; i++) {
  filterDataFrame(df, { items: ["alpha", "gamma", "epsilon"] });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  filterDataFrame(df, { items: ["alpha", "gamma", "epsilon"] });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "filter_labels",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
