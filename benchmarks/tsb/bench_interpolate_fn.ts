/**
 * Benchmark: interpolateSeries / dataFrameInterpolate — standalone functional interpolation.
 * Outputs JSON: {"function": "interpolate_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, interpolateSeries, dataFrameInterpolate } from "../../src/index.ts";

const SIZE = 50_000;
const WARMUP = 5;
const ITERATIONS = 20;

// ~10% NaN values scattered through the data
const seriesData = Array.from({ length: SIZE }, (_, i) =>
  i % 10 === 0 ? null : i * 1.0,
);
const s = new Series({ data: seriesData });

const df = DataFrame.fromColumns({
  a: Array.from({ length: SIZE }, (_, i) => (i % 7 === 0 ? null : i * 0.5)),
  b: Array.from({ length: SIZE }, (_, i) => (i % 11 === 0 ? null : Math.sin(i * 0.01) * 100)),
});

for (let i = 0; i < WARMUP; i++) {
  interpolateSeries(s, { method: "linear" });
  interpolateSeries(s, { method: "pad" });
  dataFrameInterpolate(df);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  interpolateSeries(s, { method: "linear" });
  interpolateSeries(s, { method: "pad" });
  dataFrameInterpolate(df);
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "interpolate_fn",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
