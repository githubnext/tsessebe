/**
 * Benchmark: advanceDate / parseFreq — date frequency utilities.
 * Mirrors pandas DateOffset arithmetic.
 * Outputs JSON: {"function": "advance_date_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { advanceDate, parseFreq, toDateInput } from "../../src/index.ts";

const WARMUP = 5;
const ITERATIONS = 1000;

const d = new Date("2023-06-15");
const freqSpecs = ["D", "3D", "B", "W", "MS", "ME", "h", "2h", "min", "YS"];

for (let i = 0; i < WARMUP; i++) {
  for (const f of freqSpecs) {
    const pf = parseFreq(f);
    advanceDate(d, pf);
  }
  toDateInput("2023-01-01");
  toDateInput(1672531200000);
}

const t0 = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  for (const f of freqSpecs) {
    const pf = parseFreq(f);
    advanceDate(d, pf);
  }
  toDateInput("2023-01-01");
  toDateInput(1672531200000);
}
const total = performance.now() - t0;

console.log(
  JSON.stringify({
    function: "advance_date_fn",
    mean_ms: Math.round((total / ITERATIONS) * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(total * 1000) / 1000,
  }),
);
