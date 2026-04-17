/**
 * Benchmark: getDummies / dataFrameGetDummies with prefix, dropFirst, dummyNa options.
 * Outputs JSON: {"function": "get_dummies_opts", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { getDummies, dataFrameGetDummies, Series, DataFrame } from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 30;

const categories = ["apple", "banana", "cherry", "date", "elderberry"];
const data = Array.from({ length: SIZE }, (_, i) =>
  i % 20 === 0 ? null : categories[i % categories.length],
);
const s = new Series({ data });

const df = DataFrame.fromColumns({
  fruit: Array.from({ length: SIZE }, (_, i) =>
    i % 20 === 0 ? null : categories[i % categories.length],
  ),
  color: Array.from({ length: SIZE }, (_, i) => ["red", "green", "blue"][i % 3]),
});

for (let i = 0; i < WARMUP; i++) {
  getDummies(s, { prefix: "cat", dummyNa: true });
  getDummies(s, { dropFirst: true });
  dataFrameGetDummies(df, { columns: ["fruit", "color"], prefix: "col", dropFirst: true });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  getDummies(s, { prefix: "cat", dummyNa: true });
  getDummies(s, { dropFirst: true });
  dataFrameGetDummies(df, { columns: ["fruit", "color"], prefix: "col", dropFirst: true });
}
const total = performance.now() - start;

console.log(JSON.stringify({ function: "get_dummies_opts", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
