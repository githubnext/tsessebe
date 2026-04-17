/**
 * Benchmark: melt with id_vars — unpivot a wide DataFrame keeping identifier
 * columns fixed, with custom var_name and value_name on a 10k-row DataFrame.
 * Outputs JSON: {"function": "melt_id_vars", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, melt } from "../../src/index.ts";

const ROWS = 10_000;
const WARMUP = 5;
const ITERATIONS = 30;

const ids = Array.from({ length: ROWS }, (_, i) => `id_${i}`);
const category = Array.from({ length: ROWS }, (_, i) => ["A", "B", "C"][i % 3]);
const q1 = Array.from({ length: ROWS }, (_, i) => i * 1.0);
const q2 = Array.from({ length: ROWS }, (_, i) => i * 1.1);
const q3 = Array.from({ length: ROWS }, (_, i) => i * 1.2);
const q4 = Array.from({ length: ROWS }, (_, i) => i * 1.3);

const df = DataFrame.fromColumns({ id: ids, category, Q1: q1, Q2: q2, Q3: q3, Q4: q4 });

for (let i = 0; i < WARMUP; i++) {
  melt(df, {
    id_vars: ["id", "category"],
    var_name: "quarter",
    value_name: "revenue",
  });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  melt(df, {
    id_vars: ["id", "category"],
    var_name: "quarter",
    value_name: "revenue",
  });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "melt_id_vars",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
