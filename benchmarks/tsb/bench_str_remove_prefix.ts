/**
 * Benchmark: strRemovePrefix on 100k-element string Series
 */
import { Series, strRemovePrefix } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;
const data = Array.from({ length: ROWS }, (_, i) => `prefix_value_${i}`);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) strRemovePrefix(s, "prefix_");
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) strRemovePrefix(s, "prefix_");
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "str_remove_prefix",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
