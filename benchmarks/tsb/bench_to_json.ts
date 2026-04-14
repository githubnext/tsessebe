/**
 * Benchmark: toJson — serialize a 10k-row DataFrame to JSON string
 */
import { DataFrame, toJson } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 3;
const ITERATIONS = 10;

const df = new DataFrame({
  id: Float64Array.from({ length: ROWS }, (_, i) => i),
  value: Float64Array.from({ length: ROWS }, (_, i) => i * 1.1),
  score: Float64Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.01)),
});

for (let i = 0; i < WARMUP; i++) {
  toJson(df);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  toJson(df);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "to_json",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
