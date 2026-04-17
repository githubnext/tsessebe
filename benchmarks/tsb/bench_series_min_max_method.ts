/**
 * Benchmark: Series.min() and .max() — min/max on 100k numeric Series.
 * Outputs JSON: {"function": "series_min_max_method", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 10;
const ITERATIONS = 100;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => Math.sin(i) * 1000) });

for (let i = 0; i < WARMUP; i++) {
  s.min();
  s.max();
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  s.min();
  s.max();
  times.push(performance.now() - t0);
}

const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "series_min_max_method",
    mean_ms: Math.round((total / ITERATIONS) * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(total * 1000) / 1000,
  }),
);
