/**
 * Benchmark: MultiIndex.duplicated() and dropDuplicates() on 100k-pair MultiIndex
 */
import { MultiIndex } from "../../src/index.ts";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

// Create a MultiIndex with duplicates (10k unique pairs repeated 10 times)
const a = Array.from({ length: ROWS }, (_, i) => `a${i % 100}`);
const b = Array.from({ length: ROWS }, (_, i) => i % 1000);
const tuples: [string, number][] = a.map((v, i) => [v, b[i]]);
const mi = new MultiIndex({ tuples });

for (let i = 0; i < WARMUP; i++) {
  mi.duplicated();
  mi.dropDuplicates();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  mi.duplicated();
  mi.dropDuplicates();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "multi_index_duplicated",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
