/**
 * Benchmark: interpolateSeries with bfill method and limit option — backward fill with gap limit on 50k Series.
 * Outputs JSON: {"function": "interpolate_bfill_limit", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, interpolateSeries } from "../../src/index.ts";

const SIZE = 50_000;
const WARMUP = 5;
const ITERATIONS = 30;

// ~15% NaN values with consecutive gaps of up to 5
const data = Array.from({ length: SIZE }, (_, i) => {
  const gap = i % 7;
  if (gap === 0 || gap === 1) return null;
  return Math.sin(i * 0.01) * 100;
});
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  interpolateSeries(s, { method: "bfill" });
  interpolateSeries(s, { method: "ffill", limit: 2 });
  interpolateSeries(s, { method: "bfill", limit: 1 });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  interpolateSeries(s, { method: "bfill" });
  interpolateSeries(s, { method: "ffill", limit: 2 });
  interpolateSeries(s, { method: "bfill", limit: 1 });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "interpolate_bfill_limit",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
