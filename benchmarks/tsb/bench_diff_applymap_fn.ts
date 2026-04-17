/**
 * Benchmark: diffSeries standalone + applymap — diff and element-wise map.
 * Outputs JSON: {"function": "diff_applymap_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, diffSeries, applymap } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => i * 1.0 + Math.sin(i * 0.01)) });

const df = DataFrame.fromColumns({
  a: Array.from({ length: SIZE }, (_, i) => i * 0.1),
  b: Array.from({ length: SIZE }, (_, i) => i * 0.2 + 1),
  c: Array.from({ length: SIZE }, (_, i) => i * -0.1),
});

for (let i = 0; i < WARMUP; i++) {
  diffSeries(s);
  diffSeries(s, 2);
  applymap(df, (v) => (v as number) ** 2);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  diffSeries(s);
  diffSeries(s, 2);
  applymap(df, (v) => (v as number) ** 2);
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "diff_applymap_fn",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
