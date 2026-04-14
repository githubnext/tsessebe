/**
 * Benchmark: GroupBy agg with custom function on 100k-row DataFrame
 */
import { DataFrame } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;
const keys = Array.from({ length: ROWS }, (_, i) => `g${i % 100}`);
const vals = Array.from({ length: ROWS }, (_, i) => i * 0.1);
const df = DataFrame.fromColumns({ key: keys, value: vals });
const rangeFn = (vals: readonly (string | number | null | boolean | bigint)[]) => {
  const nums = vals.filter((v): v is number => typeof v === "number");
  return nums.length ? Math.max(...nums) - Math.min(...nums) : null;
};

for (let i = 0; i < WARMUP; i++) df.groupby("key").agg(rangeFn);
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) df.groupby("key").agg(rangeFn);
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "groupby_custom_agg",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
