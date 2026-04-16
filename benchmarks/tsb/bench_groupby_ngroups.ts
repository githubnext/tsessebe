/**
 * Benchmark: DataFrameGroupBy.ngroups and .groupKeys property access.
 */
import { DataFrame } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

const df = DataFrame.fromColumns({
  key: Array.from({ length: ROWS }, (_, i) => `g${i % 100}`),
  val: Array.from({ length: ROWS }, (_, i) => i * 1.5),
});
const gbk = df.groupby("key");

for (let i = 0; i < WARMUP; i++) {
  gbk.ngroups;
  gbk.groupKeys;
}

const t0 = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  gbk.ngroups;
  gbk.groupKeys;
}
const total = performance.now() - t0;

console.log(
  JSON.stringify({ function: "groupby_ngroups", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }),
);
