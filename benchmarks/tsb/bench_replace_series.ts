/**
 * Benchmark: replaceSeries — replace values in a Series.
 * Outputs JSON: {"function": "replace_series", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { replaceSeries, Series } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => i % 10) });
const mapping = new Map<number, number>([
  [0, 100],
  [1, 200],
  [2, 300],
  [3, 400],
  [4, 500],
]);

for (let i = 0; i < WARMUP; i++) {
  replaceSeries(s, mapping);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  replaceSeries(s, mapping);
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "replace_series",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
