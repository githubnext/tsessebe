/**
 * Benchmark: pctChangeSeries / pctChangeDataFrame — standalone functional pct_change.
 * Outputs JSON: {"function": "pct_change_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, pctChangeSeries, pctChangeDataFrame } from "../../src/index.ts";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Array.from({ length: ROWS }, (_, i) => i * 1.1 + 1.0);
const s = new Series({ data });
const df = new DataFrame(
  new Map([
    ["a", new Series({ data })],
    ["b", new Series({ data: data.map((x) => x * 2) })],
  ]),
);

for (let i = 0; i < WARMUP; i++) {
  pctChangeSeries(s);
  pctChangeSeries(s, { periods: 2 });
  pctChangeDataFrame(df);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  pctChangeSeries(s);
  pctChangeSeries(s, { periods: 2 });
  pctChangeDataFrame(df);
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "pct_change_fn",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
