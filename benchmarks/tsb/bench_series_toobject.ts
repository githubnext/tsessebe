/**
 * Benchmark: Series.toObject() — convert to {label: value} record on 100k Series.
 */
import { Series } from "../../src/index.js";

const SIZE = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => i * 1.5) });

for (let i = 0; i < WARMUP; i++) s.toObject();

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  s.toObject();
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ function: "series_toobject", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
