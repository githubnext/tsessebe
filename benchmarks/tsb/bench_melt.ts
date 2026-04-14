/**
 * Benchmark: melt (wide to long) on 10k-row DataFrame
 */
import { DataFrame, melt } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 3;
const ITERATIONS = 10;

const a = Float64Array.from({ length: ROWS }, (_, i) => i * 0.1);
const b = Float64Array.from({ length: ROWS }, (_, i) => i * 0.2);
const c = Float64Array.from({ length: ROWS }, (_, i) => i * 0.3);
const df = new DataFrame({ A: a, B: b, C: c });

for (let i = 0; i < WARMUP; i++) {
  melt(df, { value_vars: ["A", "B", "C"] });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  melt(df, { value_vars: ["A", "B", "C"] });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "melt",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
