/**
 * Benchmark: EWM.corr(other) on two 100k-element Series.
 */
import { Series, EWM } from "../../src/index.js";

const SIZE = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const a = new Series({ data: Array.from({ length: SIZE }, (_, i) => Math.sin(i * 0.01)) });
const b = new Series({ data: Array.from({ length: SIZE }, (_, i) => Math.cos(i * 0.01)) });
const ewmA = new EWM(a, { span: 10 });

for (let i = 0; i < WARMUP; i++) ewmA.corr(b);

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  ewmA.corr(b);
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ function: "ewm_corr", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
