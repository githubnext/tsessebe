/**
 * Benchmark: Period.add / diff / compareTo / contains — Period arithmetic on 1k periods.
 * Outputs JSON: {"function": "period_arithmetic", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Period } from "../../src/index.ts";

const SIZE = 1_000;
const WARMUP = 5;
const ITERATIONS = 50;

const base = Period.fromDate(new Date(Date.UTC(2020, 0, 1)), "D");
const periods = Array.from({ length: SIZE }, (_, i) => base.add(i));
const other = base.add(500);

for (let i = 0; i < WARMUP; i++) {
  for (const p of periods.slice(0, 50)) {
    p.add(10);
    p.diff(other);
    p.compareTo(other);
    p.contains(p.startTime);
  }
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  for (const p of periods) {
    p.add(10);
    p.diff(other);
    p.compareTo(other);
    p.contains(p.startTime);
  }
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "period_arithmetic",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
