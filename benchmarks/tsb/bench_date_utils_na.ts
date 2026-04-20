/**
 * Benchmark: advanceDate / parseFreq / toDateInput — date utility functions.
 * Outputs JSON: {"function": "date_utils_na", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { advanceDate, parseFreq, toDateInput } from "../../src/index.ts";

const WARMUP = 5;
const ITERATIONS = 200;

const d = new Date("2023-06-15");
const freqD = parseFreq("D");
const freqM = parseFreq("MS");
const freqQ = parseFreq("QS");

for (let i = 0; i < WARMUP; i++) {
  parseFreq("D");
  parseFreq("MS");
  advanceDate(d, freqD);
  advanceDate(d, freqM);
  advanceDate(d, freqQ);
  toDateInput("2023-06-15");
  toDateInput(1686787200000);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  parseFreq("D");
  parseFreq("MS");
  advanceDate(d, freqD);
  advanceDate(d, freqM);
  advanceDate(d, freqQ);
  toDateInput("2023-06-15");
  toDateInput(1686787200000);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "date_utils_na",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
