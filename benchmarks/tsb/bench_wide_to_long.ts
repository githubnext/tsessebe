/**
 * Benchmark: wideToLong on 1000x4 DataFrame
 */
import { DataFrame, wideToLong } from "../../src/index.js";

const ROWS = 1_000;
const WARMUP = 3;
const ITERATIONS = 10;

const ids = Array.from({ length: ROWS }, (_, i) => i);
const df = new DataFrame({
  id: ids,
  value_2020: ids.map(i => i * 1.0),
  value_2021: ids.map(i => i * 1.1),
  value_2022: ids.map(i => i * 1.2),
});

for (let i = 0; i < WARMUP; i++) {
  wideToLong(df, { stubnames: ["value"], i: "id", j: "year", sep: "_" });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  wideToLong(df, { stubnames: ["value"], i: "id", j: "year", sep: "_" });
}
const total = performance.now() - start;

console.log(JSON.stringify({ function: "wide_to_long", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
