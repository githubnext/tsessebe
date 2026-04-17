/**
 * Benchmark: DatetimeAccessor.isocalendar_week on 100k datetime Series.
 * Outputs JSON: {"function": "dt_isocalendar", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series } from "../../src/index.ts";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

// Dates spanning ~274 years to cover all ISO week patterns
const base = new Date("2000-01-01").getTime();
const dates = Array.from({ length: ROWS }, (_, i) => new Date(base + i * 86_400_000));
const s = new Series({ data: dates });

for (let i = 0; i < WARMUP; i++) {
  s.dt.isocalendar_week();
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  s.dt.isocalendar_week();
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "dt_isocalendar",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
