/**
 * Benchmark: dataframe_rename — rename columns in a 100k-row DataFrame
 */
import { DataFrame } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 5;
const ITERATIONS = 20;

const a = Float64Array.from({ length: ROWS }, (_, i) => i * 1.1);
const b = Float64Array.from({ length: ROWS }, (_, i) => i * 2.2);
const df = new DataFrame({ old_a: a, old_b: b });

for (let i = 0; i < WARMUP; i++) {
  df.rename({ old_a: "new_a", old_b: "new_b" });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  df.rename({ old_a: "new_a", old_b: "new_b" });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_rename",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
