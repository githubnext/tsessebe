/**
 * Benchmark: coefficientOfVariation on 100k-element Series
 */
import { Series, coefficientOfVariation } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;
const data = Array.from({ length: ROWS }, (_, i) => i * 0.1 + 1);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) coefficientOfVariation(s);
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) coefficientOfVariation(s);
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "coefficient_of_variation",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
