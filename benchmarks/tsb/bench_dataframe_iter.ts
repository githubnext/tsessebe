/**
 * Benchmark: DataFrame.items() / DataFrame.iterrows() — column and row iteration.
 * Outputs JSON: {"function": "dataframe_iter", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame } from "../../src/index.ts";

const ROWS = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

const df = DataFrame.fromColumns({
  a: Array.from({ length: ROWS }, (_, i) => i * 1.0),
  b: Array.from({ length: ROWS }, (_, i) => i * 2.0),
  c: Array.from({ length: ROWS }, (_, i) => i * 3.0),
});

function consumeItems(df: DataFrame): void {
  for (const [, s] of df.items()) {
    void s.sum();
  }
}

function consumeIterrows(df: DataFrame): void {
  let count = 0;
  for (const _entry of df.iterrows()) {
    void _entry;
    count++;
  }
  void count;
}

for (let i = 0; i < WARMUP; i++) {
  consumeItems(df);
  consumeIterrows(df);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  consumeItems(df);
  consumeIterrows(df);
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "dataframe_iter",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
