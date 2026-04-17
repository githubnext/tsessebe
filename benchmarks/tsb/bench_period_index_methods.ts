/**
 * Benchmark: PeriodIndex.shift / sort / unique / toDatetimeStart / toDatetimeEnd — PeriodIndex operations on 1k periods.
 * Outputs JSON: {"function": "period_index_methods", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Period, PeriodIndex } from "../../src/index.ts";

const SIZE = 1_000;
const WARMUP = 5;
const ITERATIONS = 50;

const base = Period.fromDate(new Date(Date.UTC(2020, 0, 1)), "D");
// Build a shuffled index with some duplicates
const shuffled = Array.from({ length: SIZE }, (_, i) => base.add((i * 7) % SIZE));
const idx = PeriodIndex.fromPeriods(shuffled);

for (let i = 0; i < WARMUP; i++) {
  idx.shift(30);
  idx.sort();
  idx.unique();
  idx.toDatetimeStart();
  idx.toDatetimeEnd();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  idx.shift(30);
  idx.sort();
  idx.unique();
  idx.toDatetimeStart();
  idx.toDatetimeEnd();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "period_index_methods",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
