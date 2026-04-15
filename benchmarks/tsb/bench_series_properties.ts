/**
 * Benchmark: Series property access — shape, ndim, size, empty, values, dtype, name
 */
import { Series } from "../../src/index.js";

const N = 100_000;
const s = new Series({ data: Array.from({ length: N }, (_, i) => i * 1.0), name: "x" });

const WARMUP = 3;
const ITERATIONS = 100_000;

for (let i = 0; i < WARMUP; i++) {
  s.shape; s.ndim; s.size; s.empty; s.values; s.dtype; s.name;
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.shape; s.ndim; s.size; s.empty; s.values; s.dtype; s.name;
}
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "series_properties",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
