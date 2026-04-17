/**
 * Benchmark: pipe — functional pipeline composition operator on 100k-element Series and DataFrame.
 * Outputs JSON: {"function": "pipe_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, pipe, seriesAbs, seriesMul, seriesAdd } from "../../src/index.ts";
import type { Scalar } from "../../src/types.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => (i % 200) - 100.0) });
const df = DataFrame.fromColumns({
  a: Array.from({ length: SIZE }, (_, i) => (i % 100) - 50.0),
  b: Array.from({ length: SIZE }, (_, i) => Math.sin(i * 0.01) * 100),
});

const double = (x: Series<Scalar>) => seriesMul(x, 2);
const addHundred = (x: Series<Scalar>) => seriesAdd(x, 100);
const abs = (x: Series<Scalar>) => seriesAbs(x);

for (let i = 0; i < WARMUP; i++) {
  pipe(s, abs, double, addHundred);
  pipe(42, (x: number) => x * 2, (x: number) => x + 1);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  pipe(s, abs, double, addHundred);
  pipe(42, (x: number) => x * 2, (x: number) => x + 1);
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;

console.log(
  JSON.stringify({
    function: "pipe_fn",
    mean_ms: meanMs,
    iterations: ITERATIONS,
    total_ms: totalMs,
  }),
);
