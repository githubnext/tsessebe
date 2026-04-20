/**
 * Benchmark: reindexSeries with fill methods (ffill / bfill) — realign a
 * 100k-element Series to a larger index using forward-fill and backward-fill.
 * Extends bench_reindex which only tests the no-fill case.
 * Outputs JSON: {"function": "reindex_fill", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, Index, reindexSeries } from "../../src/index.ts";

const SIZE = 50_000;
const WARMUP = 5;
const ITERATIONS = 30;

// Sparse original index: every other position
const origLabels = Array.from({ length: SIZE }, (_, i) => i * 2);
const data = Array.from({ length: SIZE }, (_, i) => Math.sin(i * 0.01));
const s = new Series({ data, index: new Index(origLabels) });

// Dense new index: fills in the gaps
const newIndex = Array.from({ length: SIZE * 2 }, (_, i) => i);

for (let i = 0; i < WARMUP; i++) {
  reindexSeries(s, newIndex, { method: "ffill" });
  reindexSeries(s, newIndex, { method: "bfill" });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  reindexSeries(s, newIndex, { method: "ffill" });
  reindexSeries(s, newIndex, { method: "bfill" });
  times.push(performance.now() - t0);
}

const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "reindex_fill",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
