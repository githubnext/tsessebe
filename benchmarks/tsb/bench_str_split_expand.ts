/**
 * Benchmark: strSplitExpand on 10k-element string Series
 */
import { Series, strSplitExpand } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 3;
const ITERATIONS = 10;
const data = Array.from({ length: ROWS }, (_, i) => `a_${i}_b_${i * 2}_c`);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) strSplitExpand(s, "_");
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) strSplitExpand(s, "_");
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "str_split_expand",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
