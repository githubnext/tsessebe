/**
 * Benchmark: valueCounts with options — normalize=true, ascending=true, dropna=false.
 * Outputs JSON: {"function": "value_counts_opts", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, valueCounts } from "../../src/index.ts";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

const data = Array.from({ length: ROWS }, (_, i) => {
  if (i % 500 === 0) return null;
  return `cat_${i % 50}`;
});
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  valueCounts(s, { normalize: true });
  valueCounts(s, { ascending: true });
  valueCounts(s, { dropna: false });
  valueCounts(s, { normalize: true, ascending: true, dropna: false });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  valueCounts(s, { normalize: true });
  valueCounts(s, { ascending: true });
  valueCounts(s, { dropna: false });
  valueCounts(s, { normalize: true, ascending: true, dropna: false });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "value_counts_opts",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
