/**
 * Benchmark: Rolling with center=true and minPeriods options.
 * Outputs JSON: {"function": "rolling_center_min_periods", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series } from "../../src/index.ts";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Array.from({ length: ROWS }, (_, i) => (i % 10 === 0 ? null : Math.sin(i * 0.01)));
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.rolling(50, { center: true }).mean();
  s.rolling(100, { minPeriods: 10 }).sum();
  s.rolling(30, { center: true, minPeriods: 5 }).std();
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  s.rolling(50, { center: true }).mean();
  s.rolling(100, { minPeriods: 10 }).sum();
  s.rolling(30, { center: true, minPeriods: 5 }).std();
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "rolling_center_min_periods",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
