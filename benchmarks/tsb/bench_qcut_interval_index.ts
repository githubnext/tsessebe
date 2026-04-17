/**
 * Benchmark: qcutIntervalIndex — compute quantile-based IntervalIndex from 100k values.
 * Outputs JSON: {"function": "qcut_interval_index", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { qcutIntervalIndex } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

const data = Array.from({ length: SIZE }, (_, i) => (i * 1.1) % 1000);

// Quantile-based binning into 10 equal-frequency bins
for (let i = 0; i < WARMUP; i++) {
  qcutIntervalIndex(data, 10);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  qcutIntervalIndex(data, 10);
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "qcut_interval_index",
    mean_ms: meanMs,
    iterations: ITERATIONS,
    total_ms: totalMs,
  }),
);
