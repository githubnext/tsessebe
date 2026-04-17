/**
 * Benchmark: seriesMemoryUsage / dataFrameMemoryUsage — memory estimation.
 * Outputs JSON: {"function": "memory_usage", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, seriesMemoryUsage, dataFrameMemoryUsage } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const numSeries = new Series(Array.from({ length: SIZE }, (_, i) => i * 1.0));
const strSeries = new Series(Array.from({ length: SIZE }, (_, i) => `label_${i % 100}`));

const df = new DataFrame({
  a: Array.from({ length: SIZE }, (_, i) => i * 1.0),
  b: Array.from({ length: SIZE }, (_, i) => i * 2.0),
  c: Array.from({ length: SIZE }, (_, i) => `cat_${i % 50}`),
  d: Array.from({ length: SIZE }, (_, i) => i % 2 === 0),
});

for (let i = 0; i < WARMUP; i++) {
  seriesMemoryUsage(numSeries);
  seriesMemoryUsage(strSeries, { deep: true });
  dataFrameMemoryUsage(df);
  dataFrameMemoryUsage(df, { deep: true });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  seriesMemoryUsage(numSeries);
  seriesMemoryUsage(strSeries, { deep: true });
  dataFrameMemoryUsage(df);
  dataFrameMemoryUsage(df, { deep: true });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "memory_usage",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
