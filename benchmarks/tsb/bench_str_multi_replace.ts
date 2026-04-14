/**
 * Benchmark: strMultiReplace on 100k-element string Series
 */
import { Series, strMultiReplace } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;
const data = Array.from({ length: ROWS }, (_, i) => `foo bar baz ${i}`);
const s = new Series({ data });
const pairs: [string, string][] = [
  ["foo", "alpha"],
  ["bar", "beta"],
  ["baz", "gamma"],
];

for (let i = 0; i < WARMUP; i++) strMultiReplace(s, pairs);
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) strMultiReplace(s, pairs);
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "str_multi_replace",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
