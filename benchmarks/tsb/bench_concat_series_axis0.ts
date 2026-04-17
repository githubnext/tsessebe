/**
 * Benchmark: concat of multiple Series objects along axis=0 — vertical stacking
 * of 5 Series of 20k elements each.
 * Outputs JSON: {"function": "concat_series_axis0", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, concat } from "../../src/index.ts";

const CHUNK = 20_000;
const WARMUP = 5;
const ITERATIONS = 30;

const s1 = new Series({ data: Array.from({ length: CHUNK }, (_, i) => i * 1.0) });
const s2 = new Series({ data: Array.from({ length: CHUNK }, (_, i) => i * 2.0) });
const s3 = new Series({ data: Array.from({ length: CHUNK }, (_, i) => i * 3.0) });
const s4 = new Series({ data: Array.from({ length: CHUNK }, (_, i) => i * 4.0) });
const s5 = new Series({ data: Array.from({ length: CHUNK }, (_, i) => i * 5.0) });

for (let i = 0; i < WARMUP; i++) {
  concat([s1, s2, s3, s4, s5]);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  concat([s1, s2, s3, s4, s5]);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "concat_series_axis0",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
