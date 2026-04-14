/**
 * Benchmark: DataFrame readJson
 *
 * Parses a JSON string into a DataFrame (records orient).
 * Outputs JSON: {"function": "read_json", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */

import { readJson } from "../../src/index.ts";

const ROWS = 5_000;
const WARMUP = 5;
const ITERATIONS = 50;

function makeJsonString(): string {
  const records = Array.from({ length: ROWS }, (_, i) => ({
    id: i,
    x: i * 1.1,
    y: i * 2.2,
    label: `item_${i % 100}`,
  }));
  return JSON.stringify(records);
}

const jsonStr = makeJsonString();

for (let i = 0; i < WARMUP; i++) {
  readJson(jsonStr);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  readJson(jsonStr);
  const end = performance.now();
  times.push(end - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;

console.log(JSON.stringify({
  function: "read_json",
  mean_ms: Math.round(meanMs * 1000) / 1000,
  iterations: ITERATIONS,
  total_ms: Math.round(totalMs * 1000) / 1000,
}));
