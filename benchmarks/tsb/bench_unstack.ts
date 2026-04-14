/**
 * Benchmark: Series.unstack() — pivot innermost MultiIndex level to columns.
 * Outputs JSON: {"function": "unstack", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series } from "../../src/index.ts";

const ROWS = 500;
const COLS = 10;
const WARMUP = 5;
const ITERATIONS = 50;

const data = Array.from({ length: ROWS * COLS }, (_, i) => i * 1.0);
const index = Array.from(
  { length: ROWS * COLS },
  (_, i) => [Math.floor(i / COLS), i % COLS] as [number, number],
);
const s = new Series({ data, index });

for (let i = 0; i < WARMUP; i++) {
  s.unstack();
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  s.unstack();
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "unstack",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
