/**
 * Benchmark: quantileSeries / quantileDataFrame — standalone quantile functions.
 * Outputs JSON: {"function": "quantile_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, quantileSeries, quantileDataFrame } from "../../src/index.ts";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Array.from({ length: ROWS }, (_, i) => (i * 1.41) % 10000);
const s = new Series({ data });
const df = new DataFrame(
  new Map([
    ["a", new Series({ data })],
    ["b", new Series({ data: data.map((x) => x * 2) })],
    ["c", new Series({ data: data.map((x) => x * 0.5) })],
  ]),
);

for (let i = 0; i < WARMUP; i++) {
  quantileSeries(s, { q: 0.25 });
  quantileSeries(s, { q: [0.1, 0.5, 0.9] });
  quantileDataFrame(df, { q: 0.5 });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  quantileSeries(s, { q: 0.25 });
  quantileSeries(s, { q: [0.1, 0.5, 0.9] });
  quantileDataFrame(df, { q: 0.5 });
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "quantile_fn",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
