/**
 * Benchmark: DataFrameGroupBy .groups / .groupKeys / .ngroups properties on 100k rows.
 * Outputs JSON: {"function": "groupby_groups_props", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, DataFrameGroupBy } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const depts = ["eng", "hr", "sales", "finance", "ops", "legal", "mkt", "it", "rd", "ops2"];
const df = DataFrame.fromColumns({
  dept: Array.from({ length: SIZE }, (_, i) => depts[i % depts.length]),
  salary: Array.from({ length: SIZE }, (_, i) => 50_000 + (i % 100) * 1000),
  score: Array.from({ length: SIZE }, (_, i) => (i % 100) * 0.01),
});

const gb = new DataFrameGroupBy(df, ["dept"]);

for (let i = 0; i < WARMUP; i++) {
  const _g = gb.groups;
  const _k = gb.groupKeys;
  const _n = gb.ngroups;
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  const _g = gb.groups;
  const _k = gb.groupKeys;
  const _n = gb.ngroups;
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;

console.log(
  JSON.stringify({
    function: "groupby_groups_props",
    mean_ms: meanMs,
    iterations: ITERATIONS,
    total_ms: totalMs,
  }),
);
