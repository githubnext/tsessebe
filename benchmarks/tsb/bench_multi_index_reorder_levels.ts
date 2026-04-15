/**
 * Benchmark: MultiIndex.reorderLevels() on 100k-pair MultiIndex
 */
import { MultiIndex } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;
const a = Array.from({ length: ROWS }, (_, i) => `a${i % 100}`);
const b = Array.from({ length: ROWS }, (_, i) => i % 1000);
const c = Array.from({ length: ROWS }, (_, i) => i % 50);
const tuples: [string, number, number][] = a.map((v, i) => [v, b[i] as number, c[i] as number]);
const mi = new MultiIndex({ tuples });

for (let i = 0; i < WARMUP; i++) mi.reorderLevels([2, 0, 1]);
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) mi.reorderLevels([2, 0, 1]);
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "multi_index_reorder_levels",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
