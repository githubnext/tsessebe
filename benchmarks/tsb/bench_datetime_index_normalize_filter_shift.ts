/**
 * Benchmark: DatetimeIndex.normalize() / filter() / shift(n, freq) — DatetimeIndex transforms.
 * Outputs JSON: {"function": "datetime_index_normalize_filter_shift", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { date_range } from "../../src/index.ts";

const SIZE = 5_000;
const WARMUP = 5;
const ITERATIONS = 50;

// Index with non-midnight times (so normalize actually changes something)
const idx = date_range({ start: "2020-01-01T12:30:00", periods: SIZE, freq: "h" });
const cutoff = new Date("2021-01-01T00:00:00Z");

for (let i = 0; i < WARMUP; i++) {
  idx.normalize();
  idx.filter((d) => d < cutoff);
  idx.shift(7, "D");
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  idx.normalize();
  idx.filter((d) => d < cutoff);
  idx.shift(7, "D");
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "datetime_index_normalize_filter_shift",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
