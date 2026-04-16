/**
 * Benchmark: merge with left_on/right_on — join on differently-named columns.
 */
import { DataFrame, merge } from "../../src/index.js";

const ROWS = 20_000;
const WARMUP = 3;
const ITERATIONS = 10;

const left = DataFrame.fromColumns({
  emp_id: Array.from({ length: ROWS }, (_, i) => i),
  salary: Array.from({ length: ROWS }, (_, i) => 30000 + i * 10),
});
const right = DataFrame.fromColumns({
  id: Array.from({ length: ROWS / 2 }, (_, i) => i),
  dept: Array.from({ length: ROWS / 2 }, (_, i) => `dept${i % 10}`),
});

for (let i = 0; i < WARMUP; i++) {
  merge(left, right, { left_on: "emp_id", right_on: "id" });
}

const t0 = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  merge(left, right, { left_on: "emp_id", right_on: "id" });
}
const total = performance.now() - t0;

console.log(
  JSON.stringify({ function: "merge_left_on_right_on", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }),
);
