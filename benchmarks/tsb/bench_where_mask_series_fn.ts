/**
 * Benchmark: whereSeries / maskSeries — standalone functional where/mask for Series.
 * Outputs JSON: {"function": "where_mask_series_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, whereSeries, maskSeries } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => i * 0.1) });
const cond = (v: unknown) => (v as number) > SIZE * 0.05;
const condArr = Array.from({ length: SIZE }, (_, i) => i > SIZE * 0.5);

for (let i = 0; i < WARMUP; i++) {
  whereSeries(s, cond, 0);
  maskSeries(s, condArr, -1);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  whereSeries(s, cond, 0);
  maskSeries(s, condArr, -1);
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "where_mask_series_fn",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
