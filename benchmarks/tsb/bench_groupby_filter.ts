/**
 * Benchmark: GroupBy filter on 100k-row DataFrame
 */
import { DataFrame } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;
const keys = Array.from({ length: ROWS }, (_, i) => `g${i % 200}`);
const vals = Array.from({ length: ROWS }, (_, i) => i * 0.1);
const df = DataFrame.fromColumns({ key: keys, value: vals });

for (let i = 0; i < WARMUP; i++) df.groupby("key").filter((sub) => sub.shape[0] > 400);
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) df.groupby("key").filter((sub) => sub.shape[0] > 400);
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "groupby_filter",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
