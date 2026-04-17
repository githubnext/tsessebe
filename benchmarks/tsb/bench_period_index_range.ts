/**
 * Benchmark: PeriodIndex.periodRange / PeriodIndex.fromPeriods — PeriodIndex construction.
 * Outputs JSON: {"function": "period_index_range", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Period, PeriodIndex } from "../../src/index.ts";

const WARMUP = 5;
const ITERATIONS = 50;

const startPeriod = Period.fromDate(new Date(Date.UTC(2000, 0, 1)), "D");
const startMonth = Period.fromDate(new Date(Date.UTC(2000, 0, 1)), "M");
const dayPeriods = Array.from({ length: 365 * 10 }, (_, i) =>
  Period.fromDate(new Date(Date.UTC(2000, 0, 1) + i * 86_400_000), "D"),
);

for (let i = 0; i < WARMUP; i++) {
  PeriodIndex.periodRange(startPeriod, 3650);
  PeriodIndex.periodRange(startMonth, 120);
  PeriodIndex.fromPeriods(dayPeriods.slice(0, 365));
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  PeriodIndex.periodRange(startPeriod, 3650);
  PeriodIndex.periodRange(startMonth, 120);
  PeriodIndex.fromPeriods(dayPeriods.slice(0, 365));
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "period_index_range",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
