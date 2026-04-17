/**
 * Benchmark: seriesSign — element-wise sign on 100k-element Series.
 * Outputs JSON: {"function": "series_sign", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, seriesSign } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const data = Array.from({ length: SIZE }, (_, i) => Math.sin(i * 0.01) * 1000);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  seriesSign(s);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  seriesSign(s);
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;

console.log(
  JSON.stringify({
    function: "series_sign",
    mean_ms: meanMs,
    iterations: ITERATIONS,
    total_ms: totalMs,
  }),
);
