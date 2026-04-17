/**
 * Benchmark: Series.var() — variance on 100k numeric Series.
 * Outputs JSON: {"function": "series_var_method", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 10;
const ITERATIONS = 100;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => i * 0.5) });

for (let i = 0; i < WARMUP; i++) s.var();

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  s.var();
  times.push(performance.now() - t0);
}

const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "series_var_method",
    mean_ms: Math.round((total / ITERATIONS) * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(total * 1000) / 1000,
  }),
);
