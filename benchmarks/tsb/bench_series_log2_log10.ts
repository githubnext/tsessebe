/**
 * Benchmark: seriesLog2 / seriesLog10 / dataFrameLog2 / dataFrameLog10 on 100k values.
 * Outputs JSON: {"function": "series_log2_log10", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, seriesLog2, seriesLog10, dataFrameLog2, dataFrameLog10 } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

const data = Array.from({ length: SIZE }, (_, i) => (i + 1) * 0.01);
const s = new Series({ data });
const df = DataFrame.fromColumns({
  a: data,
  b: Array.from({ length: SIZE }, (_, i) => (i + 1) * 0.02),
  c: Array.from({ length: SIZE }, (_, i) => (i + 1) * 0.03),
});

for (let i = 0; i < WARMUP; i++) {
  seriesLog2(s);
  seriesLog10(s);
  dataFrameLog2(df);
  dataFrameLog10(df);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  seriesLog2(s);
  seriesLog10(s);
  dataFrameLog2(df);
  dataFrameLog10(df);
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "series_log2_log10",
    mean_ms: meanMs,
    iterations: ITERATIONS,
    total_ms: totalMs,
  }),
);
