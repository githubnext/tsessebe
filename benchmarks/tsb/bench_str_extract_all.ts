/**
 * Benchmark: strExtractAll on 10k-element string Series
 */
import { Series, strExtractAll } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 3;
const ITERATIONS = 10;
const data = Array.from({ length: ROWS }, (_, i) => `val${i} num${i * 2} extra${i}`);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) strExtractAll(s, /\d+/g);
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) strExtractAll(s, /\d+/g);
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "str_extract_all",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
