/**
 * Benchmark: strGetDummies on 10k-element string Series
 */
import { Series, strGetDummies } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 3;
const ITERATIONS = 10;
const data = Array.from({ length: ROWS }, (_, i) => `a|b|${String.fromCharCode(97 + (i % 5))}`);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) strGetDummies(s, { sep: "|" });
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) strGetDummies(s, { sep: "|" });
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "str_get_dummies",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
