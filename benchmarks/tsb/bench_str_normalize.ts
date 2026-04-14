/**
 * Benchmark: strNormalize on 100k-element string Series
 */
import { Series, strNormalize } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;
const data = Array.from({ length: ROWS }, (_, i) => `caf\u00e9 ${i}`);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) strNormalize(s, "NFC");
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) strNormalize(s, "NFC");
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "str_normalize",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
