/**
 * Benchmark: dateRange — generate a fixed-frequency sequence of Date objects.
 * Mirrors pandas.date_range().
 * Outputs JSON: {"function": "date_range_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { dateRange } from "../../src/index.ts";

const WARMUP = 5;
const ITERATIONS = 100;

const start = new Date("2020-01-01");
const end = new Date("2022-12-31");

for (let i = 0; i < WARMUP; i++) {
  dateRange({ start, end, freq: "D" });
  dateRange({ start, periods: 365, freq: "D" });
  dateRange({ start, periods: 24, freq: "h" });
}

const t0 = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  dateRange({ start, end, freq: "D" });
  dateRange({ start, periods: 365, freq: "D" });
  dateRange({ start, periods: 24, freq: "h" });
}
const total = performance.now() - t0;

console.log(
  JSON.stringify({
    function: "date_range_fn",
    mean_ms: Math.round((total / ITERATIONS) * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(total * 1000) / 1000,
  }),
);
