/**
 * Benchmark: dataFrameFromPairs — build a DataFrame from [column, Series] pairs
 */
import { DataFrame, Series, dataFrameFromPairs } from "../../src/index.js";

const N = 10_000;
const pairs: [string, Series<number>][] = [
  ["a", new Series({ data: Array.from({ length: N }, (_, i) => i) })],
  ["b", new Series({ data: Array.from({ length: N }, (_, i) => i * 2) })],
  ["c", new Series({ data: Array.from({ length: N }, (_, i) => i * 3) })],
];

const WARMUP = 3;
const ITERATIONS = 100;

for (let i = 0; i < WARMUP; i++) {
  dataFrameFromPairs(pairs);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  dataFrameFromPairs(pairs);
}
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "df_from_pairs",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
