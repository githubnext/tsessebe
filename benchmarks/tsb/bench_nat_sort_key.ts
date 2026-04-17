/**
 * Benchmark: natSortKey — compute natural-sort key tokens for strings.
 * Outputs JSON: {"function": "nat_sort_key", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { natSortKey } from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

const data = Array.from(
  { length: SIZE },
  (_, i) => `file${i % 1000}_v${(i % 10) + 1}.${i % 100}`,
);
const mixedCase = Array.from(
  { length: SIZE },
  (_, i) => `Item${i % 500}_Part${(i % 20) + 1}`,
);

for (let i = 0; i < WARMUP; i++) {
  for (let j = 0; j < SIZE; j++) {
    natSortKey(data[j]);
    natSortKey(mixedCase[j], { ignoreCase: true });
  }
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  for (let j = 0; j < SIZE; j++) {
    natSortKey(data[j]);
    natSortKey(mixedCase[j], { ignoreCase: true });
  }
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "nat_sort_key",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
