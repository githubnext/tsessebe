/**
 * Benchmark: nancount / nanprod / nanmedian — extended nan-ignoring aggregates.
 * Outputs JSON: {"function": "nan_agg_extended", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { nancount, nanprod, nanmedian } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

// Array with ~15% NaN values
const data: (number | null)[] = Array.from({ length: SIZE }, (_, i) =>
  i % 7 === 0 ? null : Math.cos(i * 0.02) * 50 + 1,
);

for (let i = 0; i < WARMUP; i++) {
  nancount(data);
  nanprod(data.slice(0, 1000)); // nanprod on small slice to avoid overflow
  nanmedian(data);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  nancount(data);
  nanprod(data.slice(0, 1000));
  nanmedian(data);
}
const total = performance.now() - start;

console.log(JSON.stringify({ function: "nan_agg_extended", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
