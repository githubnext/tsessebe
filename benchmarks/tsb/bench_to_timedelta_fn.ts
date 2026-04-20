/**
 * Benchmark: toTimedelta — convert scalar/array/Series to Timedelta objects.
 * Mirrors pandas.to_timedelta().
 * Outputs JSON: {"function": "to_timedelta_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, toTimedelta } from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

const numArr = Array.from({ length: SIZE }, (_, i) => i * 1_000_000);
const strArr = Array.from({ length: SIZE }, (_, i) => `${i % 24}h`);
const s = new Series({ data: numArr });

for (let i = 0; i < WARMUP; i++) {
  toTimedelta(3600, { unit: "s" });
  toTimedelta(numArr, { unit: "ms" });
  toTimedelta(s, { unit: "ms" });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  toTimedelta(3600, { unit: "s" });
  toTimedelta(numArr, { unit: "ms" });
  toTimedelta(s, { unit: "ms" });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "to_timedelta_fn",
    mean_ms: Math.round((total / ITERATIONS) * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(total * 1000) / 1000,
  }),
);
