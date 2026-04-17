/**
 * Benchmark: StringAccessor.split() — s.str.split(pat, n) on 100k strings.
 * Distinct from strSplitExpand (which uses the standalone function).
 * Outputs JSON: {"function": "str_split_method", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

const data = Array.from({ length: SIZE }, (_, i) => `part${i % 100}_b${i % 50}_c${i % 25}`);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.str.split("_");
  s.str.split("_", undefined, 2);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  s.str.split("_");
  s.str.split("_", undefined, 2);
  times.push(performance.now() - t0);
}

const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "str_split_method",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
