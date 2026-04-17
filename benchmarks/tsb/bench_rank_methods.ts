/**
 * Benchmark: rankSeries with different tie-breaking methods (min/max/first/dense).
 * Outputs JSON: {"function": "rank_methods", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, rankSeries } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

// Data with many ties to stress different tie-breaking methods
const data = Array.from({ length: SIZE }, (_, i) => Math.floor(i / 5) * 1.0);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  rankSeries(s, { method: "min" });
  rankSeries(s, { method: "max" });
  rankSeries(s, { method: "first" });
  rankSeries(s, { method: "dense" });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  rankSeries(s, { method: "min" });
  rankSeries(s, { method: "max" });
  rankSeries(s, { method: "first" });
  rankSeries(s, { method: "dense" });
}
const total = performance.now() - start;

console.log(JSON.stringify({ function: "rank_methods", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
