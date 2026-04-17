/**
 * Benchmark: Index.map(fn) — transform Index values to a new Index using a mapping function.
 * Outputs JSON: {"function": "index_map", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Index } from "../../src/index.ts";

const SIZE = 50_000;
const WARMUP = 5;
const ITERATIONS = 50;

const numIdx = new Index(Array.from({ length: SIZE }, (_, i) => i));
const strIdx = new Index(Array.from({ length: SIZE }, (_, i) => `key_${i % 1000}`));

for (let i = 0; i < WARMUP; i++) {
  numIdx.map((v) => (v as number) * 2);
  strIdx.map((v) => (v as string).toUpperCase());
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  numIdx.map((v) => (v as number) * 2);
  strIdx.map((v) => (v as string).toUpperCase());
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "index_map",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
