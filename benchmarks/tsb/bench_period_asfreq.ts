/**
 * Benchmark: Period.asfreq and PeriodIndex.asfreq — frequency conversion.
 * Outputs JSON: {"function": "period_asfreq", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Period, PeriodIndex } from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 3;
const ITERATIONS = 20;

// Build a PeriodIndex of monthly periods using periodRange
const startMonth = Period.fromString("2000-01", "M");
const idx = PeriodIndex.periodRange(startMonth, SIZE);

for (let i = 0; i < WARMUP; i++) {
  idx.asfreq("D", "start");
  idx.asfreq("D", "end");
  idx.asfreq("Q", "start");
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  idx.asfreq("D", "start");
  idx.asfreq("D", "end");
  idx.asfreq("Q", "start");
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "period_asfreq",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
