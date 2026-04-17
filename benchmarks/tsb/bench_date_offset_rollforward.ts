/**
 * Benchmark: DateOffset.rollforward / rollback / onOffset — snap dates to offset anchors.
 * Tests MonthEnd, BusinessDay, YearBegin, MonthBegin, YearEnd.
 * Outputs JSON: {"function": "date_offset_rollforward", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { MonthEnd, BusinessDay, YearBegin, MonthBegin, YearEnd } from "../../src/index.ts";

const SIZE = 5_000;
const WARMUP = 5;
const ITERATIONS = 50;

const monthEnd = new MonthEnd(1);
const bizDay = new BusinessDay(1);
const yearBegin = new YearBegin(1);
const monthBegin = new MonthBegin(1);
const yearEnd = new YearEnd(1);

const base = new Date(Date.UTC(2020, 0, 15));
const dates = Array.from({ length: SIZE }, (_, i) => new Date(base.getTime() + i * 86_400_000));

for (let i = 0; i < WARMUP; i++) {
  for (const d of dates.slice(0, 100)) {
    monthEnd.rollforward(d);
    monthEnd.rollback(d);
    monthEnd.onOffset(d);
    bizDay.rollforward(d);
    bizDay.rollback(d);
    bizDay.onOffset(d);
    yearBegin.rollforward(d);
    yearBegin.rollback(d);
    monthBegin.rollforward(d);
    monthBegin.rollback(d);
    yearEnd.rollforward(d);
    yearEnd.rollback(d);
  }
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  for (const d of dates) {
    monthEnd.rollforward(d);
    monthEnd.rollback(d);
    monthEnd.onOffset(d);
    bizDay.rollforward(d);
    bizDay.rollback(d);
    yearBegin.rollforward(d);
    yearBegin.rollback(d);
    monthBegin.rollforward(d);
    monthBegin.rollback(d);
    yearEnd.rollforward(d);
    yearEnd.rollback(d);
  }
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "date_offset_rollforward",
    mean_ms: Math.round((total / ITERATIONS) * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(total * 1000) / 1000,
  }),
);
