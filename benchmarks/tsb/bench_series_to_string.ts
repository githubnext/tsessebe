/**
 * Benchmark: seriesToString on 1k-element Series
 */
import { Series, seriesToString } from "../../src/index.js";

const N = 1_000;
const WARMUP = 3;
const ITERATIONS = 10;
const data = Array.from({ length: N }, (_, i) => i * 0.1);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) seriesToString(s);
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) seriesToString(s);
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "series_to_string",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
