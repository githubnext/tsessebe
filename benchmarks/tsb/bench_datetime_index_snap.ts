/**
 * Benchmark: DatetimeIndex.snap(freq) — snap index dates to frequency boundaries.
 * Outputs JSON: {"function": "datetime_index_snap", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { date_range } from "../../src/index.ts";

const SIZE = 5_000;
const WARMUP = 5;
const ITERATIONS = 50;

// Dates that are not on month/week boundaries
const idx = date_range({ start: "2020-01-15", periods: SIZE, freq: "D" });

for (let i = 0; i < WARMUP; i++) {
  idx.snap("MS"); // snap to month start
  idx.snap("W"); // snap to week
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  idx.snap("MS");
  idx.snap("W");
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "datetime_index_snap",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
