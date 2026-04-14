/**
 * Benchmark: GroupBy apply (identity) on 100k-row DataFrame
 */
import { DataFrame } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 2;
const ITERATIONS = 5;
const keys = Array.from({ length: ROWS }, (_, i) => `g${i % 50}`);
const vals = Array.from({ length: ROWS }, (_, i) => i * 0.1);
const df = DataFrame.fromColumns({ key: keys, value: vals });

for (let i = 0; i < WARMUP; i++) df.groupby("key").apply((sub) => sub);
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) df.groupby("key").apply((sub) => sub);
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "groupby_apply",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
