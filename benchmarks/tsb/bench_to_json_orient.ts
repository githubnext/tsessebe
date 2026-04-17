/**
 * Benchmark: toJson with different orient options on 10k-row DataFrame.
 * Outputs JSON: {"function": "to_json_orient", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, toJson } from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 3;
const ITERATIONS = 20;

const df = DataFrame.fromColumns({
  id: Array.from({ length: SIZE }, (_, i) => i),
  value: Array.from({ length: SIZE }, (_, i) => i * 1.1),
  label: Array.from({ length: SIZE }, (_, i) => `cat_${i % 10}`),
});

for (let i = 0; i < WARMUP; i++) {
  toJson(df, { orient: "records" });
  toJson(df, { orient: "split" });
  toJson(df, { orient: "columns" });
  toJson(df, { orient: "values" });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  toJson(df, { orient: "records" });
  toJson(df, { orient: "split" });
  toJson(df, { orient: "columns" });
  toJson(df, { orient: "values" });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "to_json_orient",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
