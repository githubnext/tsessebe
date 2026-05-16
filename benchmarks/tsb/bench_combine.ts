/**
 * Benchmark: combineSeries / combineDataFrame — element-wise binary combine.
 * Outputs JSON: {"function": "combine", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, combineSeries, combineDataFrame } from "../../src/index.js";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 100;

const a = new Series({ data: Array.from({ length: SIZE }, (_, i) => i), index: Array.from({ length: SIZE }, (_, i) => i) });
const b = new Series({ data: Array.from({ length: SIZE }, (_, i) => SIZE - i), index: Array.from({ length: SIZE }, (_, i) => i) });

const dfA = DataFrame.fromColumns({
  x: Array.from({ length: SIZE }, (_, i) => i),
  y: Array.from({ length: SIZE }, (_, i) => i * 2),
});
const dfB = DataFrame.fromColumns({
  x: Array.from({ length: SIZE }, (_, i) => SIZE - i),
  z: Array.from({ length: SIZE }, (_, i) => i * 3),
});

const addFn = (p: unknown, q: unknown) => (p as number) + (q as number);

for (let i = 0; i < WARMUP; i++) {
  combineSeries(a, b, addFn, 0);
  combineDataFrame(dfA, dfB, addFn, { fillValue: 0 });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  combineSeries(a, b, addFn, 0);
  combineDataFrame(dfA, dfB, addFn, { fillValue: 0 });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "combine",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
