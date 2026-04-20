/**
 * Benchmark: dateRange (stats) — generate date arrays with various frequencies.
 * Outputs JSON: {"function": "date_range_stats_na", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { dateRange } from "../../src/index.ts";

const WARMUP = 5;
const ITERATIONS = 100;

const start_ = new Date("2020-01-01");
const end_ = new Date("2022-12-31");

for (let i = 0; i < WARMUP; i++) {
  dateRange({ start: start_, end: end_, freq: "D" });
  dateRange({ start: start_, periods: 365, freq: "D" });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  dateRange({ start: start_, end: end_, freq: "D" });
  dateRange({ start: start_, periods: 365, freq: "D" });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "date_range_stats_na",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
