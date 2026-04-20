/**
 * Benchmark: formatTimedelta / parseFrac — Timedelta formatting utilities.
 * Mirrors pandas Timedelta string formatting.
 * Outputs JSON: {"function": "format_timedelta_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Timedelta, formatTimedelta, parseFrac, toTimedelta } from "../../src/index.ts";

const WARMUP = 5;
const ITERATIONS = 500;

// Create timedelta instances
const tds = [
  new Timedelta(0),
  new Timedelta(1_000),
  new Timedelta(86_400_000),
  new Timedelta(3_661_001),
  new Timedelta(-7_200_500),
];

for (let i = 0; i < WARMUP; i++) {
  for (const td of tds) {
    formatTimedelta(td);
  }
  parseFrac("123456789");
  parseFrac("000000001");
  toTimedelta(3600, { unit: "s" });
}

const t0 = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  for (const td of tds) {
    formatTimedelta(td);
  }
  parseFrac("123456789");
  parseFrac("000000001");
  toTimedelta(3600, { unit: "s" });
}
const total = performance.now() - t0;

console.log(
  JSON.stringify({
    function: "format_timedelta_fn",
    mean_ms: Math.round((total / ITERATIONS) * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(total * 1000) / 1000,
  }),
);
