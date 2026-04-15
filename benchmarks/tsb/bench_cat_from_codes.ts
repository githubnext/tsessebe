/**
 * Benchmark: catFromCodes on 100k-element code array
 */
import { catFromCodes } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;
const categories = ["alpha", "beta", "gamma", "delta"];
const codes = Array.from({ length: ROWS }, (_, i) => i % 4);

for (let i = 0; i < WARMUP; i++) catFromCodes(codes, categories);
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) catFromCodes(codes, categories);
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "cat_from_codes",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
