/**
 * Benchmark: catFreqTable on 100k-element categorical Series
 */
import { Series, catFreqTable } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;
const cats = ["low", "med", "high", "ultra"];
const s = new Series({ data: Array.from({ length: ROWS }, (_, i) => cats[i % 4]) });

for (let i = 0; i < WARMUP; i++) catFreqTable(s);
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) catFreqTable(s);
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "cat_freq_table",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
