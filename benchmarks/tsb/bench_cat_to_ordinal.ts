/**
 * Benchmark: catToOrdinal on 100k-element categorical Series
 */
import { Series, catToOrdinal } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;
const cats = ["low", "med", "high"];
const data = Array.from({ length: ROWS }, (_, i) => cats[i % 3]);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) catToOrdinal(s, cats);
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) catToOrdinal(s, cats);
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "cat_to_ordinal",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
