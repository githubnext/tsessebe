/**
 * Benchmark: DataFrameGroupBy with multiple key columns — groupby(["dept","region"]).
 * Outputs JSON: {"function": "groupby_multi_key", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame } from "../../src/index.ts";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const depts = ["eng", "sales", "hr", "ops"];
const regions = ["north", "south", "east", "west"];
const dept = Array.from({ length: ROWS }, (_, i) => depts[i % depts.length]);
const region = Array.from({ length: ROWS }, (_, i) => regions[i % regions.length]);
const value = Array.from({ length: ROWS }, (_, i) => i * 0.5);
const bonus = Array.from({ length: ROWS }, (_, i) => i * 0.1);

const df = DataFrame.fromColumns({ dept, region, value, bonus });

for (let i = 0; i < WARMUP; i++) {
  df.groupby(["dept", "region"]).sum();
  df.groupby(["dept", "region"]).mean();
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  df.groupby(["dept", "region"]).sum();
  df.groupby(["dept", "region"]).mean();
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "groupby_multi_key",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
