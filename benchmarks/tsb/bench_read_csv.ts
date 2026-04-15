/**
 * Benchmark: read_csv — parse a 100k-row CSV string
 */
import { readCsv } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 2;
const ITERATIONS = 5;

// Build CSV string
const lines = ["id,value,label"];
for (let i = 0; i < ROWS; i++) {
  lines.push(`${i},${(i * 1.1).toFixed(4)},cat_${i % 50}`);
}
const csvContent = lines.join("\n");

for (let i = 0; i < WARMUP; i++) {
  readCsv(csvContent);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  readCsv(csvContent);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "read_csv",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
