/**
 * Benchmark: PeriodIndex.getLoc / contains — querying a PeriodIndex.
 * Outputs JSON: {"function": "period_index_query", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Period, PeriodIndex } from "../../src/index.ts";

const SIZE = 1_000;
const WARMUP = 5;
const ITERATIONS = 100;

const base = Period.fromDate(new Date(Date.UTC(2020, 0, 1)), "M");
const periods = Array.from({ length: SIZE }, (_, i) => base.add(i));
const idx = PeriodIndex.fromPeriods(periods);

const queryPeriod = base.add(500);
const midPeriod = base.add(250);

for (let i = 0; i < WARMUP; i++) {
  idx.getLoc(queryPeriod);
  idx.contains(queryPeriod);
  idx.getLoc(midPeriod);
  idx.contains(midPeriod);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  idx.getLoc(queryPeriod);
  idx.contains(queryPeriod);
  idx.getLoc(midPeriod);
  idx.contains(midPeriod);
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "period_index_query",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
