/**
 * Benchmark: DataFrameGroupBy.aggNamed — named aggregation spec with 100k rows.
 * Outputs JSON: {"function": "named_agg", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, DataFrameGroupBy, namedAgg } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 20;

const depts = ["eng", "hr", "sales", "finance", "ops"];
const df = new DataFrame({
  dept: Array.from({ length: SIZE }, (_, i) => depts[i % depts.length]),
  salary: Array.from({ length: SIZE }, (_, i) => 50_000 + (i % 100) * 1000),
  headcount: Array.from({ length: SIZE }, (_, i) => 1 + (i % 5)),
  score: Array.from({ length: SIZE }, (_, i) => (i % 100) * 0.1),
});

const gb = new DataFrameGroupBy(df, ["dept"]);

for (let i = 0; i < WARMUP; i++) {
  gb.aggNamed({
    total_salary: namedAgg("salary", "sum"),
    avg_salary: namedAgg("salary", "mean"),
    max_salary: namedAgg("salary", "max"),
    employees: namedAgg("headcount", "count"),
    avg_score: namedAgg("score", "mean"),
  });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  gb.aggNamed({
    total_salary: namedAgg("salary", "sum"),
    avg_salary: namedAgg("salary", "mean"),
    max_salary: namedAgg("salary", "max"),
    employees: namedAgg("headcount", "count"),
    avg_score: namedAgg("score", "mean"),
  });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "named_agg",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
