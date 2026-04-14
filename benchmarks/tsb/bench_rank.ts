/**
 * Benchmark: Series rank
 *
 * Ranks a large numeric Series using average tie-breaking.
 * Outputs JSON: {"function": "rank", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */

import { Series, rankSeries } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

function makeData(): readonly number[] {
  return Array.from({ length: SIZE }, (_, i) => Math.floor(i / 3) * 1.5);
}

const s = new Series({ data: Array.from(makeData()) });

for (let i = 0; i < WARMUP; i++) {
  rankSeries(s, { method: "average" });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  rankSeries(s, { method: "average" });
  const end = performance.now();
  times.push(end - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;

console.log(JSON.stringify({
  function: "rank",
  mean_ms: Math.round(meanMs * 1000) / 1000,
  iterations: ITERATIONS,
  total_ms: Math.round(totalMs * 1000) / 1000,
}));
