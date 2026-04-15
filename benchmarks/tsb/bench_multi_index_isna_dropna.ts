/**
 * Benchmark: MultiIndex.isna(), notna(), and dropna() on 100k-pair MultiIndex with some nulls
 */
import { MultiIndex } from "../../src/index.ts";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

// Create a MultiIndex with some null values
const a = Array.from({ length: ROWS }, (_, i) => (i % 10 === 0 ? null : `a${i % 100}`));
const b = Array.from({ length: ROWS }, (_, i) => (i % 20 === 0 ? null : i % 1000));
const tuples: [string | null, number | null][] = a.map((v, i) => [v, b[i]]);
const mi = new MultiIndex({ tuples });

for (let i = 0; i < WARMUP; i++) {
  mi.isna();
  mi.notna();
  mi.dropna();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  mi.isna();
  mi.notna();
  mi.dropna();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "multi_index_isna_dropna",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
