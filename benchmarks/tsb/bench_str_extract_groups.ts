/**
 * Benchmark: strExtractGroups on 10k-element string Series
 */
import { Series, strExtractGroups } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 3;
const ITERATIONS = 10;
const data = Array.from({ length: ROWS }, (_, i) => `user_${i}_score_${i % 100}`);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) strExtractGroups(s, /user_(\d+)_score_(\d+)/);
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) strExtractGroups(s, /user_(\d+)_score_(\d+)/);
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "str_extract_groups",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
