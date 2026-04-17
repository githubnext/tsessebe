/**
 * Benchmark: toCsv with options — sep, header, index settings.
 * Outputs JSON: {"function": "to_csv_options", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, toCsv } from "../../src/index.ts";

const ROWS = 10_000;
const WARMUP = 3;
const ITERATIONS = 20;

const df = DataFrame.fromColumns({
  id: Array.from({ length: ROWS }, (_, i) => i),
  value: Array.from({ length: ROWS }, (_, i) => i * 1.1),
  label: Array.from({ length: ROWS }, (_, i) => `cat_${i % 50}`),
});

for (let i = 0; i < WARMUP; i++) {
  toCsv(df, { sep: "\t" });
  toCsv(df, { header: false });
  toCsv(df, { index: false });
  toCsv(df, { sep: "|", header: false, index: false });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  toCsv(df, { sep: "\t" });
  toCsv(df, { header: false });
  toCsv(df, { index: false });
  toCsv(df, { sep: "|", header: false, index: false });
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "to_csv_options",
    mean_ms: meanMs,
    iterations: ITERATIONS,
    total_ms: totalMs,
  }),
);
