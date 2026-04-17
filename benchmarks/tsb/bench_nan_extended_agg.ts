/**
 * Benchmark: nancount / nanmedian / nanprod — nan-ignoring aggregates on a 100k-element array.
 * Outputs JSON: {"function": "nan_extended_agg", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { nancount, nanmedian, nanprod } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

// Array with ~10% null values; use small values to avoid nanprod overflow
const data: (number | null)[] = Array.from({ length: SIZE }, (_, i) =>
  i % 10 === 0 ? null : (i % 100) * 0.01 + 1,
);

for (let i = 0; i < WARMUP; i++) {
  nancount(data);
  nanmedian(data);
  nanprod(data);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  nancount(data);
  nanmedian(data);
  nanprod(data);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "nan_extended_agg",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
