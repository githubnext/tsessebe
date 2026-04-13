/**
 * Benchmark: wideToLong reshape on a 1k-row DataFrame with 10 year columns
 */
import { DataFrame, wideToLong } from "../../src/index.js";

const ROWS = 1_000;
const WARMUP = 5;
const ITERATIONS = 20;

const data: Record<string, number[] | string[]> = {
  id: Array.from({ length: ROWS }, (_, i) => `id${i}`),
};
for (let y = 2010; y < 2020; y++) {
  data[`value${y}`] = Array.from({ length: ROWS }, (_, i) => i * y * 0.001);
}
const df = new DataFrame(data);

for (let i = 0; i < WARMUP; i++) {
  wideToLong(df, { stubnames: ["value"], i: ["id"], j: "year" });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  wideToLong(df, { stubnames: ["value"], i: ["id"], j: "year" });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "wide_to_long",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
