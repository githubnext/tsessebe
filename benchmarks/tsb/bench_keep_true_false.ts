/**
 * Benchmark: keepTrue / keepFalse — boolean mask filtering on a 100k-element Series
 */
import { Series, keepTrue, keepFalse } from "../../src/index.js";

const N = 100_000;
const WARMUP = 2;
const ITERATIONS = 5;

const data = Array.from({ length: N }, (_, i) => i * 1.0);
const mask = Array.from({ length: N }, (_, i) => i % 2 === 0);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  keepTrue(s, mask);
  keepFalse(s, mask);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  keepTrue(s, mask);
  keepFalse(s, mask);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "keep_true_false",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
