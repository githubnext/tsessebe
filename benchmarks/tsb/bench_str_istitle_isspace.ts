/**
 * Benchmark: str_istitle_isspace — str.istitle and str.isspace on 100k strings
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Array.from({ length: ROWS }, (_, i) => (i % 3 === 0 ? `Hello World` : i % 3 === 1 ? `   ` : `hello world`));
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.str.istitle();
  s.str.isspace();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.str.istitle();
  s.str.isspace();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "str_istitle_isspace",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
