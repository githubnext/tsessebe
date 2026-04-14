/**
 * Benchmark: formatEngineering on 100k numbers
 */
import { formatEngineering } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;
const data = Array.from({ length: ROWS }, (_, i) => i * 1.5e3);

for (let i = 0; i < WARMUP; i++) data.map((v) => formatEngineering(v));
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) data.map((v) => formatEngineering(v));
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "format_engineering",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
