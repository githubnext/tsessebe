/**
 * Benchmark: toTimedelta / formatTimedelta / parseFrac — timedelta parsing and formatting.
 * Outputs JSON: {"function": "timedelta_ops_na", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { toTimedelta, formatTimedelta, parseFrac, Timedelta } from "../../src/index.ts";

const WARMUP = 5;
const ITERATIONS = 100;

const td = new Timedelta(3661000); // 1h 1m 1s in ms
const vals = ["1h", "30m", "2.5s", "100ms", "1d 2h"];

for (let i = 0; i < WARMUP; i++) {
  for (const v of vals) toTimedelta(v);
  formatTimedelta(td);
  parseFrac("1.5");
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  for (const v of vals) toTimedelta(v);
  formatTimedelta(td);
  parseFrac("1.5");
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "timedelta_ops_na",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
