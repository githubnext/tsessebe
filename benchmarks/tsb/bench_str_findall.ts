/**
 * Benchmark: strFindall, strFindFirst, strFindallCount on 10k-element string Series
 */
import { Series, strFindall, strFindFirst, strFindallCount } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 3;
const ITERATIONS = 10;
const data = Array.from({ length: ROWS }, (_, i) => `item${i} code${i * 3} ref${i + 1}`);
const s = new Series({ data });
const pat = /\d+/g;

for (let i = 0; i < WARMUP; i++) {
  strFindall(s, pat);
  strFindFirst(s, pat);
  strFindallCount(s, pat);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  strFindall(s, pat);
  strFindFirst(s, pat);
  strFindallCount(s, pat);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "str_findall",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
