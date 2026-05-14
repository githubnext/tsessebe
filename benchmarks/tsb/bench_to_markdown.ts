/**
 * Benchmark: toMarkdown and toLaTeX on a 1000-row DataFrame
 */
import { DataFrame, toMarkdown, toLaTeX } from "../../src/index.js";

const ROWS = 1_000;
const WARMUP = 3;
const ITERATIONS = 10;

const a = Float64Array.from({ length: ROWS }, (_, i) => i * 1.5);
const b = Array.from({ length: ROWS }, (_, i) => `item_${i % 50}`);
const c = Int32Array.from({ length: ROWS }, (_, i) => i % 100);
const df = DataFrame.fromColumns({ a, b, c });

for (let i = 0; i < WARMUP; i++) {
  toMarkdown(df);
  toLaTeX(df);
}

const startMd = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  toMarkdown(df);
}
const totalMd = performance.now() - startMd;

const startLtx = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  toLaTeX(df);
}
const totalLtx = performance.now() - startLtx;

const total = totalMd + totalLtx;

console.log(
  JSON.stringify({
    function: "to_markdown_latex",
    mean_ms: total / (ITERATIONS * 2),
    iterations: ITERATIONS * 2,
    total_ms: total,
  }),
);
