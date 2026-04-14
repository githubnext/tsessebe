/**
 * Benchmark: series round (2 decimals) on 100k-element Series
 */
import { Series, seriesRound } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Float64Array.from({ length: ROWS }, (_, i) => (i % 10000) * 0.1234);
const s = new Series(data);

for (let i = 0; i < WARMUP; i++) {
  seriesRound(s, { decimals: 2 });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  seriesRound(s, { decimals: 2 });
}
const total = performance.now() - start;

console.log(JSON.stringify({ function: "series_round", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
