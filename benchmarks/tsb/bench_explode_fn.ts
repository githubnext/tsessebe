/**
 * Benchmark: explodeSeries / explodeDataFrame — standalone functional explode.
 * Outputs JSON: {"function": "explode_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, explodeSeries, explodeDataFrame } from "../../src/index.ts";

const ROWS = 10_000;
const WARMUP = 5;
const ITERATIONS = 20;

// Each row contains a list of 2-5 values
const seriesData = Array.from({ length: ROWS }, (_, i) => {
  const len = (i % 4) + 2;
  return Array.from({ length: len }, (_, j) => i * 10 + j);
});
const s = new Series({ data: seriesData });

const df = DataFrame.fromColumns({
  a: Array.from({ length: ROWS }, (_, i) => {
    const len = (i % 3) + 1;
    return Array.from({ length: len }, (_, j) => i + j);
  }),
  b: Array.from({ length: ROWS }, (_, i) => `key_${i % 100}`),
});

for (let i = 0; i < WARMUP; i++) {
  explodeSeries(s);
  explodeDataFrame(df, "a");
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  explodeSeries(s);
  explodeDataFrame(df, "a");
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "explode_fn",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
