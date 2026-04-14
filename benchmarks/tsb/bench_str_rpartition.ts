/**
 * Benchmark: strRPartition on 100k-element string Series
 */
import { Series, strRPartition } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;
const data = Array.from({ length: ROWS }, (_, i) => `prefix_${i}_suffix`);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) strRPartition(s, "_");
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) strRPartition(s, "_");
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "str_rpartition",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
