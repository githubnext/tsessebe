/**
 * Benchmark: shiftSeries (standalone export from stats/shift_diff.ts) — shift
 * a 100k-element Series by 1 and 3 periods. Uses the exported shiftSeries
 * function (distinct from the earlier manual-impl bench_series_shift).
 * Outputs JSON: {"function": "series_shift_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, shiftSeries } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => i * 0.5) });

for (let i = 0; i < WARMUP; i++) {
  shiftSeries(s, 1);
  shiftSeries(s, 3);
  shiftSeries(s, -2);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  shiftSeries(s, 1);
  shiftSeries(s, 3);
  shiftSeries(s, -2);
  times.push(performance.now() - t0);
}

const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "series_shift_fn",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
