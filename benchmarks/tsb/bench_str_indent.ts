/**
 * Benchmark: strIndent on 50k multi-line strings
 */
import { strIndent } from "../../src/index.js";

const N = 50_000;
const WARMUP = 3;
const ITERATIONS = 10;
const data = Array.from({ length: N }, (_, i) => `line1 ${i}\nline2 ${i}\nline3 ${i}`);

for (let i = 0; i < WARMUP; i++) data.map((s) => strIndent(s, { prefix: "  " }));
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) data.map((s) => strIndent(s, { prefix: "  " }));
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "str_indent",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
