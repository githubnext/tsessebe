/**
 * Benchmark: strRemoveSuffix on 100k-element string Series
 */
import { Series, strRemoveSuffix } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;
const data = Array.from({ length: ROWS }, (_, i) => `value_${i}_suffix`);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) strRemoveSuffix(s, "_suffix");
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) strRemoveSuffix(s, "_suffix");
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "str_remove_suffix",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
