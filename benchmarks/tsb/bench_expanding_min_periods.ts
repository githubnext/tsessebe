/**
 * Benchmark: Expanding with minPeriods option.
 * Outputs JSON: {"function": "expanding_min_periods", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series } from "../../src/index.ts";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Array.from({ length: ROWS }, (_, i) => (i % 10 === 0 ? null : Math.sin(i * 0.01)));
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.expanding(10).mean();
  s.expanding(50).sum();
  s.expanding(5).std();
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  s.expanding(10).mean();
  s.expanding(50).sum();
  s.expanding(5).std();
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "expanding_min_periods",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
