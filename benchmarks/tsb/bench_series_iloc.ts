/**
 * Benchmark: Series.iloc(positions[]) — integer position selection on 100k Series.
 */
import { Series } from "../../src/index.js";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => i * 3.0) });
const positions = Array.from({ length: 1000 }, (_, i) => i * 100);

for (let i = 0; i < WARMUP; i++) s.iloc(positions);

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  s.iloc(positions);
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ function: "series_iloc", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
