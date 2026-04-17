/**
 * Benchmark: Timedelta advanced operations — parse, toISOString, divBy, negate, mul, compareTo, equals.
 * Outputs JSON: {"function": "timedelta_advanced_ops", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Timedelta } from "../../src/index.ts";

const SIZE = 1_000;
const WARMUP = 5;
const ITERATIONS = 100;

const isoStrings = [
  "P1DT2H30M",
  "PT45M",
  "P7D",
  "-PT1H30M",
  "P10DT5H20M15S",
];

const td1 = Timedelta.fromComponents({ days: 2, hours: 3 });
const td2 = Timedelta.fromComponents({ hours: 5, minutes: 30 });
const deltas = Array.from({ length: SIZE }, (_, i) =>
  Timedelta.fromComponents({ days: i % 365, hours: i % 24 }),
);

for (let w = 0; w < WARMUP; w++) {
  for (const s of isoStrings) Timedelta.parse(s);
  for (const td of deltas.slice(0, 50)) {
    td.toISOString();
    td.divBy(td1);
    td.negate();
    td.mul(2);
    td.compareTo(td2);
    td.equals(td1);
  }
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  for (const s of isoStrings) Timedelta.parse(s);
  for (const td of deltas) {
    td.toISOString();
    td.negate();
    td.mul(3);
    td.compareTo(td2);
    td.equals(td1);
  }
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "timedelta_advanced_ops",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
