/**
 * Benchmark: DataFrame melt (unpivot)
 *
 * Creates a wide DataFrame and melts it into long format.
 * Outputs JSON: {"function": "melt", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */

import { DataFrame, melt } from "../../src/index.ts";

const ROWS = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

function makeFrame(): DataFrame {
  const data: Record<string, number[]> = {
    id: Array.from({ length: ROWS }, (_, i) => i),
    a: Array.from({ length: ROWS }, (_, i) => i * 1.1),
    b: Array.from({ length: ROWS }, (_, i) => i * 2.2),
    c: Array.from({ length: ROWS }, (_, i) => i * 3.3),
  };
  return new DataFrame({ data });
}

const df = makeFrame();

for (let i = 0; i < WARMUP; i++) {
  melt(df, { idVars: ["id"], valueVars: ["a", "b", "c"] });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  melt(df, { idVars: ["id"], valueVars: ["a", "b", "c"] });
  const end = performance.now();
  times.push(end - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;

console.log(JSON.stringify({
  function: "melt",
  mean_ms: Math.round(meanMs * 1000) / 1000,
  iterations: ITERATIONS,
  total_ms: Math.round(totalMs * 1000) / 1000,
}));
