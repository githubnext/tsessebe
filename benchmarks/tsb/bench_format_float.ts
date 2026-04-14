/**
 * Benchmark: formatFloat on 100k numbers
 */
import { formatFloat } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;
const data = Array.from({ length: ROWS }, (_, i) => i * 3.14159);
const fmt = formatFloat(3);

for (let i = 0; i < WARMUP; i++) data.map((v) => fmt(v));
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) data.map((v) => fmt(v));
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "format_float",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
