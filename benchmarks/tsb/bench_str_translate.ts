/**
 * Benchmark: strTranslate on 100k-element string Series
 */
import { Series, strTranslate } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;
const data = Array.from({ length: ROWS }, (_, i) => `hello world ${i}`);
const s = new Series({ data });
const table: Record<string, string> = { h: "H", w: "W", o: "0" };

for (let i = 0; i < WARMUP; i++) strTranslate(s, table);
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) strTranslate(s, table);
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "str_translate",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
