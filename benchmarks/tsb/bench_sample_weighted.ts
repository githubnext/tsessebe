/**
 * Benchmark: sampleSeries with weights — weighted random sampling from a
 * 100k-element Series. Extends bench_sample_fn which tests unweighted sampling.
 * Outputs JSON: {"function": "sample_weighted", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, sampleSeries } from "../../src/index.ts";

const SIZE = 100_000;
const N_SAMPLE = 1_000;
const WARMUP = 5;
const ITERATIONS = 30;

const data = Array.from({ length: SIZE }, (_, i) => i * 0.5);
// Weights: higher values get more weight (triangular distribution)
const weights = Array.from({ length: SIZE }, (_, i) => (i + 1) / SIZE);

const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  sampleSeries(s, { n: N_SAMPLE, weights });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  sampleSeries(s, { n: N_SAMPLE, weights });
  times.push(performance.now() - t0);
}

const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "sample_weighted",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
