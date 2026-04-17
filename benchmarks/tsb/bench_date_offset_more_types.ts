/**
 * Benchmark: DateOffset more types — apply operations for MonthBegin, YearEnd, Week, Minute, Milli.
 * These DateOffset classes haven't been covered in existing benchmarks.
 * Outputs JSON: {"function": "date_offset_more_types", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { MonthBegin, YearEnd, Week, Minute, Milli } from "../../src/index.ts";

const SIZE = 5_000;
const WARMUP = 5;
const ITERATIONS = 50;

const monthBegin = new MonthBegin(1);
const yearEnd = new YearEnd(1);
const week = new Week(2);
const minute = new Minute(60);
const milli = new Milli(1000);

const base = new Date(Date.UTC(2020, 0, 15, 10, 30, 0));
const dates = Array.from({ length: SIZE }, (_, i) => new Date(base.getTime() + i * 60_000));

for (let i = 0; i < WARMUP; i++) {
  for (const d of dates.slice(0, 100)) {
    monthBegin.apply(d);
    yearEnd.apply(d);
    week.apply(d);
    minute.apply(d);
    milli.apply(d);
  }
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  for (const d of dates) {
    monthBegin.apply(d);
    yearEnd.apply(d);
    week.apply(d);
    minute.apply(d);
    milli.apply(d);
  }
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "date_offset_more_types",
    mean_ms: Math.round((total / ITERATIONS) * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(total * 1000) / 1000,
  }),
);
