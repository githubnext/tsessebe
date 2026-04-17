/**
 * Benchmark: readCsv with options — sep, header, skipRows, dtype casting.
 * Outputs JSON: {"function": "read_csv_options", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { readCsv } from "../../src/index.ts";

const ROWS = 10_000;
const WARMUP = 3;
const ITERATIONS = 20;

// Build pipe-separated CSV (no header)
const pipeLines: string[] = [];
for (let i = 0; i < ROWS; i++) {
  pipeLines.push(`${i}|${(i * 1.1).toFixed(4)}|cat_${i % 50}`);
}
const pipeCsv = pipeLines.join("\n");

// Build comma-separated CSV (skip first 2 rows)
const skipLines: string[] = ["# comment row 1", "# comment row 2", "id,value,label"];
for (let i = 0; i < ROWS; i++) {
  skipLines.push(`${i},${(i * 2.2).toFixed(4)},grp_${i % 20}`);
}
const skipCsv = skipLines.join("\n");

// Build CSV for dtype override
const dtypeLines: string[] = ["id,value,flag"];
for (let i = 0; i < ROWS; i++) {
  dtypeLines.push(`${i},${i * 1.5},${i % 2}`);
}
const dtypeCsv = dtypeLines.join("\n");

for (let i = 0; i < WARMUP; i++) {
  readCsv(pipeCsv, { sep: "|", header: null });
  readCsv(skipCsv, { skipRows: 2 });
  readCsv(dtypeCsv, { dtype: { id: "int32", value: "float32" } });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  readCsv(pipeCsv, { sep: "|", header: null });
  readCsv(skipCsv, { skipRows: 2 });
  readCsv(dtypeCsv, { dtype: { id: "int32", value: "float32" } });
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "read_csv_options",
    mean_ms: meanMs,
    iterations: ITERATIONS,
    total_ms: totalMs,
  }),
);
