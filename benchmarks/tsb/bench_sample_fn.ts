/**
 * Benchmark: sampleSeries / sampleDataFrame — standalone functional sample.
 * Outputs JSON: {"function": "sample_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, sampleSeries, sampleDataFrame } from "../../src/index.ts";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

const data = Array.from({ length: ROWS }, (_, i) => i * 1.5);
const s = new Series({ data });
const df = new DataFrame(
  new Map([
    ["a", new Series({ data })],
    ["b", new Series({ data: data.map((x) => x * 2) })],
    ["c", new Series({ data: data.map((x) => x + 100) })],
  ]),
);

for (let i = 0; i < WARMUP; i++) {
  sampleSeries(s, { n: 1000 });
  sampleSeries(s, { frac: 0.01 });
  sampleDataFrame(df, { n: 500 });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  sampleSeries(s, { n: 1000 });
  sampleSeries(s, { frac: 0.01 });
  sampleDataFrame(df, { n: 500 });
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "sample_fn",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
