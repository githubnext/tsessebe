/**
 * Benchmark: formatCurrency on 100k numbers
 */
import { formatCurrency } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;
const data = Array.from({ length: ROWS }, (_, i) => i * 9.99);

for (let i = 0; i < WARMUP; i++) data.map((v) => formatCurrency(v));
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) data.map((v) => formatCurrency(v));
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "format_currency",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
