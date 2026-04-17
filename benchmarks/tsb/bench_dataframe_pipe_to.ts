/**
 * Benchmark: dataFramePipeTo — insert DataFrame at a specific argument position in a pipeline.
 * Outputs JSON: {"function": "dataframe_pipe_to", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, dataFramePipeTo } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const left = DataFrame.fromColumns({
  key: Array.from({ length: SIZE }, (_, i) => i % 1000),
  val: Array.from({ length: SIZE }, (_, i) => i * 1.5),
});

const right = DataFrame.fromColumns({
  key: Array.from({ length: 1000 }, (_, i) => i),
  label: Array.from({ length: 1000 }, (_, i) => `item_${i}`),
});

// A simple transform: filter df rows where col > threshold
function filterAbove(threshold: number, df: DataFrame): DataFrame {
  return df.filter((row) => (row["val"] as number) > threshold);
}

for (let i = 0; i < WARMUP; i++) {
  // dataFramePipeTo inserts `left` at position 1: filterAbove(threshold, left)
  dataFramePipeTo(left, 1, filterAbove, 50_000);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  dataFramePipeTo(left, 1, filterAbove, 50_000);
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "dataframe_pipe_to",
    mean_ms: meanMs,
    iterations: ITERATIONS,
    total_ms: totalMs,
  }),
);
