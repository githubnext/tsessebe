/**
 * Benchmark: autoCorr on a 10k-element Series and corrWith on a DataFrame
 */
import { Series, DataFrame, autoCorr, corrWith } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Float64Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.05) * 50 + (i % 7) * 2.0);
const s = new Series(data);
const df = DataFrame.fromColumns({
  a: Float64Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.03) * 40),
  b: Float64Array.from({ length: ROWS }, (_, i) => Math.cos(i * 0.07) * 20),
  c: Float64Array.from({ length: ROWS }, (_, i) => (i % 5) * 3.0),
});
const other = new Series(Float64Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.04) * 35));

for (let i = 0; i < WARMUP; i++) {
  autoCorr(s, 1);
  corrWith(df, other);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  autoCorr(s, 1);
  corrWith(df, other);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "corrwith",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
