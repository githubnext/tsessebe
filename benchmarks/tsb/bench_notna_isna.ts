/**
 * Benchmark: notna/isna on 100k-element Series with NaN
 */
import { Series, notna, isna } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;
const data: (number | null)[] = Array.from({ length: ROWS }, (_, i) =>
  i % 5 === 0 ? null : i * 0.1,
);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  notna(s);
  isna(s);
}
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  notna(s);
  isna(s);
}
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "notna_isna",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
