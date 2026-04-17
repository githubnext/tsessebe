/**
 * Benchmark: isnull / notnull — aliases for isna / notna on Series and DataFrame.
 * Outputs JSON: {"function": "isnull_notnull", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { isnull, notnull, Series, DataFrame } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const s = new Series({
  data: Array.from({ length: SIZE }, (_, i) => (i % 7 === 0 ? null : i * 0.1)),
});
const df = new DataFrame({
  a: Array.from({ length: SIZE }, (_, i) => (i % 5 === 0 ? null : i)),
  b: Array.from({ length: SIZE }, (_, i) => (i % 3 === 0 ? null : i * 2.5)),
});

for (let i = 0; i < WARMUP; i++) {
  isnull(s);
  notnull(s);
  isnull(df);
  notnull(df);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  isnull(s);
  notnull(s);
  isnull(df);
  notnull(df);
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "isnull_notnull",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
