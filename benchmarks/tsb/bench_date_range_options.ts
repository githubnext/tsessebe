/**
 * Benchmark: date_range — generate DatetimeIndex with various frequency options.
 * Tests date_range with calendar, business, month-start/end, quarter, year freqs.
 * Outputs JSON: {"function": "date_range_options", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { date_range } from "../../src/index.ts";

const WARMUP = 5;
const ITERATIONS = 100;

for (let i = 0; i < WARMUP; i++) {
  date_range({ start: "2020-01-01", periods: 1_000, freq: "D" });
  date_range({ start: "2020-01-01", periods: 1_000, freq: "H" });
  date_range({ start: "2020-01-01", periods: 500, freq: "ME" });
  date_range({ start: "2020-01-01", periods: 200, freq: "QE" });
  date_range({ start: "2020-01-01", periods: 100, freq: "YE" });
  date_range({ start: "2020-01-01", periods: 500, freq: "MS" });
  date_range({ start: "2020-01-01", end: "2025-01-01", freq: "W" });
  date_range({ start: "2020-01-01", periods: 2_000, freq: "min" });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  date_range({ start: "2020-01-01", periods: 1_000, freq: "D" });
  date_range({ start: "2020-01-01", periods: 1_000, freq: "H" });
  date_range({ start: "2020-01-01", periods: 500, freq: "ME" });
  date_range({ start: "2020-01-01", periods: 200, freq: "QE" });
  date_range({ start: "2020-01-01", periods: 100, freq: "YE" });
  date_range({ start: "2020-01-01", periods: 500, freq: "MS" });
  date_range({ start: "2020-01-01", end: "2025-01-01", freq: "W" });
  date_range({ start: "2020-01-01", periods: 2_000, freq: "min" });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "date_range_options",
    mean_ms: Math.round((total / ITERATIONS) * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(total * 1000) / 1000,
  }),
);


console.log(
  JSON.stringify({
    function: "date_range_options",
    mean_ms: Math.round((total / ITERATIONS) * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(total * 1000) / 1000,
  }),
);
