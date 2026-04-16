/**
 * Benchmark: alignSeries — align two 50k-element Series on inner/outer join.
 * Outputs JSON: {"function": "align_series", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, Index, alignSeries } from "../../src/index.ts";

const SIZE = 50_000;
const WARMUP = 5;
const ITERATIONS = 30;

// Two overlapping indexes: evens vs multiples of 3
const idxA = Array.from({ length: SIZE }, (_, i) => i * 2);
const idxB = Array.from({ length: SIZE }, (_, i) => i * 3);
const dataA = Array.from({ length: SIZE }, (_, i) => i * 1.0);
const dataB = Array.from({ length: SIZE }, (_, i) => i * 2.0);
const seriesA = new Series(dataA, { index: new Index(idxA) });
const seriesB = new Series(dataB, { index: new Index(idxB) });

for (let i = 0; i < WARMUP; i++) {
  alignSeries(seriesA, seriesB, { join: "inner" });
  alignSeries(seriesA, seriesB, { join: "outer" });
  alignSeries(seriesA, seriesB, { join: "left" });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  alignSeries(seriesA, seriesB, { join: "inner" });
  alignSeries(seriesA, seriesB, { join: "outer" });
  alignSeries(seriesA, seriesB, { join: "left" });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "align_series",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
