/**
 * Benchmark: describe() with percentiles / include options on 100k-row DataFrame.
 * Outputs JSON: {"function": "describe_opts", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, describe } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

const df = DataFrame.fromColumns({
  a: Array.from({ length: SIZE }, (_, i) => i * 1.5),
  b: Array.from({ length: SIZE }, (_, i) => (i % 1000) * 0.7),
  label: Array.from({ length: SIZE }, (_, i) => `cat_${i % 10}`),
  flag: Array.from({ length: SIZE }, (_, i) => i % 2 === 0),
});

for (let i = 0; i < WARMUP; i++) {
  describe(df, { percentiles: [0.1, 0.25, 0.5, 0.75, 0.9] });
  describe(df, { include: "all" });
  describe(df, { include: "object" });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  describe(df, { percentiles: [0.1, 0.25, 0.5, 0.75, 0.9] });
  describe(df, { include: "all" });
  describe(df, { include: "object" });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "describe_opts",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
