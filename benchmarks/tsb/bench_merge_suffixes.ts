/**
 * Benchmark: merge with custom suffixes option.
 * Outputs JSON: {"function": "merge_suffixes", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, merge } from "../../src/index.ts";

const ROWS = 50_000;
const WARMUP = 3;
const ITERATIONS = 10;

const ids = Array.from({ length: ROWS }, (_, i) => i % 10_000);
const left = new DataFrame(
  new Map([
    ["id", new Series({ data: ids })],
    ["value", new Series({ data: ids.map((x) => x * 1.1) })],
    ["score", new Series({ data: ids.map((x) => x * 0.5) })],
  ]),
);
const right = new DataFrame(
  new Map([
    ["id", new Series({ data: Array.from({ length: 10_000 }, (_, i) => i) })],
    ["value", new Series({ data: Array.from({ length: 10_000 }, (_, i) => i * 2.0) })],
    ["rank", new Series({ data: Array.from({ length: 10_000 }, (_, i) => i) })],
  ]),
);

for (let i = 0; i < WARMUP; i++) {
  merge(left, right, { on: "id", suffixes: ["_left", "_right"] });
  merge(left, right, { on: "id", how: "outer", suffixes: ["_l", "_r"] });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  merge(left, right, { on: "id", suffixes: ["_left", "_right"] });
  merge(left, right, { on: "id", how: "outer", suffixes: ["_l", "_r"] });
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "merge_suffixes",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
