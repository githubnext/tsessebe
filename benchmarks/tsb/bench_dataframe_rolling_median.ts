/**
 * Benchmark: DataFrameRolling.median / DataFrameExpanding.median — rolling and expanding median on DataFrame.
 * Outputs JSON: {"function": "dataframe_rolling_median", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame } from "../../src/index.ts";

const ROWS = 10_000;
const WARMUP = 3;
const ITERATIONS = 20;

const df = DataFrame.fromColumns({
  a: Array.from({ length: ROWS }, (_, i) => i * 0.1),
  b: Array.from({ length: ROWS }, (_, i) => (i * 0.3) % 500),
});

for (let i = 0; i < WARMUP; i++) {
  df.rolling(10).median();
  df.expanding(1).median();
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  df.rolling(10).median();
  df.expanding(1).median();
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "dataframe_rolling_median",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
