/**
 * Benchmark: catRecode on 100k-element categorical Series
 */
import { Series, catRecode } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;
const cats = ["a", "b", "c"];
const data = Array.from({ length: ROWS }, (_, i) => cats[i % 3]);
const s = new Series({ data });
const map: Record<string, string> = { a: "x", b: "y", c: "z" };

for (let i = 0; i < WARMUP; i++) catRecode(s, map);
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) catRecode(s, map);
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "cat_recode",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
