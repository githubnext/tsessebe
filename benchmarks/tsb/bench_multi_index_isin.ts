/**
 * Benchmark: MultiIndex.isin() on 100k-pair MultiIndex
 */
import { MultiIndex } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;
const a = Array.from({ length: ROWS }, (_, i) => `a${i % 100}`);
const b = Array.from({ length: ROWS }, (_, i) => i % 1000);
const tuples: [string, number][] = a.map((v, i) => [v, b[i] as number]);
const mi = new MultiIndex({ tuples });
// 1000 tuples to look up
const lookupTuples: [string, number][] = Array.from({ length: 1000 }, (_, i) => [
  `a${i % 100}`,
  i % 1000,
]);

for (let i = 0; i < WARMUP; i++) mi.isin(lookupTuples);
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) mi.isin(lookupTuples);
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "multi_index_isin",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
