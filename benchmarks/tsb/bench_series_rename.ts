/**
 * Benchmark: Series.rename(name) on 100k Series.
 */
import { Series } from "../../src/index.js";

const SIZE = 100_000;
const WARMUP = 10;
const ITERATIONS = 100;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => i), name: "old_name" });

for (let i = 0; i < WARMUP; i++) s.rename("new_name");

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  s.rename("new_name");
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ function: "series_rename", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
