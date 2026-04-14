/**
 * Benchmark: catSortByFreq on 100k-element categorical Series
 */
import { Series, catSortByFreq } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;
const cats = ["rare", "common", "very_common", "ultra_common"];
const data: string[] = [];
for (let i = 0; i < ROWS; i++) {
  const r = i % 51;
  data.push(r < 1 ? cats[0] : r < 6 ? cats[1] : r < 21 ? cats[2] : cats[3]);
}
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) catSortByFreq(s);
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) catSortByFreq(s);
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "cat_sort_by_freq",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
