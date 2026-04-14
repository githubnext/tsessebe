/**
 * Benchmark: Series.interpolate() — linear interpolation over NaN values.
 * Outputs JSON: {"function": "interpolate", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const data = Array.from({ length: SIZE }, (_, i) => (i % 5 === 0 ? Number.NaN : i * 1.0));
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.interpolate({ method: "linear" });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  s.interpolate({ method: "linear" });
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "interpolate",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
