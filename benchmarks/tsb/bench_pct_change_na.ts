/**
 * Benchmark: pctChangeSeries / pctChangeDataFrame — percent change computations.
 * Outputs JSON: {"function": "pct_change_na", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, pctChangeSeries, pctChangeDataFrame } from "../../src/index.ts";

const SIZE = 100_000;
const ROWS = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => 100 + Math.sin(i / 100)) });
const df = DataFrame.fromColumns({
  price: Array.from({ length: ROWS }, (_, i) => 100 + i * 0.01),
  volume: Array.from({ length: ROWS }, (_, i) => 1000 + (i % 100) * 10),
  ratio: Array.from({ length: ROWS }, (_, i) => 0.5 + Math.cos(i / 1000)),
});

for (let i = 0; i < WARMUP; i++) {
  pctChangeSeries(s);
  pctChangeSeries(s, { periods: 5 });
  pctChangeDataFrame(df);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  pctChangeSeries(s);
  pctChangeSeries(s, { periods: 5 });
  pctChangeDataFrame(df);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "pct_change_na",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
