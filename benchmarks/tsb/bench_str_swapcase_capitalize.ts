/**
 * Benchmark: str_swapcase_capitalize — str.swapcase and str.capitalize on 100k strings.
 * Outputs JSON: {"function": "str_swapcase_capitalize", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series } from "../../src/index.ts";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Array.from({ length: ROWS }, (_, i) => `Hello World ${i % 500} EXAMPLE`);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.str.swapcase();
  s.str.capitalize();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.str.swapcase();
  s.str.capitalize();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "str_swapcase_capitalize",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
