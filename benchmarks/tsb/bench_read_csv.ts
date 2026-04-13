/**
 * Benchmark: read_csv — parse a 100k-row CSV string
 */
import { read_csv } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 2;
const ITERATIONS = 5;

// Build CSV string
const lines = ["id,value,label"];
for (let i = 0; i < ROWS; i++) {
  lines.push(`${i},${(i * 1.1).toFixed(4)},cat_${i % 50}`);
}
const csvContent = lines.join("\n");

// Write to a temp file
import { writeFileSync } from "node:fs";
const tmpPath = "/tmp/gh-aw/agent/bench_read_csv.csv";
writeFileSync(tmpPath, csvContent, "utf8");

for (let i = 0; i < WARMUP; i++) {
  read_csv(tmpPath);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  read_csv(tmpPath);
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
