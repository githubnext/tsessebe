/**
 * Benchmark: strDedent on 50k multi-line strings
 */
import { strDedent } from "../../src/index.js";

const N = 50_000;
const WARMUP = 3;
const ITERATIONS = 10;
const data = Array.from({ length: N }, (_, i) => `  line1 ${i}\n  line2 ${i}\n  line3 ${i}`);

for (let i = 0; i < WARMUP; i++) data.map((s) => strDedent(s));
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) data.map((s) => strDedent(s));
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "str_dedent",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
