/**
 * Benchmark: crosstab() — compute a cross-tabulation.
 * Outputs JSON: {"function": "crosstab", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, crosstab } from "../../src/index.ts";

const SIZE = 50_000;
const WARMUP = 5;
const ITERATIONS = 50;

const choices_a = ["x", "y", "z"];
const choices_b = ["p", "q", "r", "s"];
let seed = 42;
function rand(): number {
  seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
  return seed;
}

const a = new Series({ data: Array.from({ length: SIZE }, () => choices_a[rand() % 3]) });
const b = new Series({ data: Array.from({ length: SIZE }, () => choices_b[rand() % 4]) });

for (let i = 0; i < WARMUP; i++) {
  crosstab(a, b);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  crosstab(a, b);
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "crosstab",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
