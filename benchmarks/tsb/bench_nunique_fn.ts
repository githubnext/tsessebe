/**
 * Benchmark: nuniqueSeries — standalone functional nunique for Series.
 * Outputs JSON: {"function": "nunique_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, nuniqueSeries, nuniqueDataFrame } from "../../src/index.ts";

const ROWS = 100_000;
const WARMUP = 5;
const ITERATIONS = 20;

// Low-cardinality series (1000 unique values) and high-cardinality (50k unique)
const low = new Series({ data: Array.from({ length: ROWS }, (_, i) => i % 1000) });
const high = new Series({ data: Array.from({ length: ROWS }, (_, i) => i % 50_000) });
const withNulls = new Series({
  data: Array.from({ length: ROWS }, (_, i) => (i % 100 === 0 ? null : i % 2000)),
});
const df = new DataFrame(
  new Map([
    ["a", low],
    ["b", high],
    ["c", withNulls],
  ]),
);

for (let i = 0; i < WARMUP; i++) {
  nuniqueSeries(low);
  nuniqueSeries(withNulls, { dropna: false });
  nuniqueDataFrame(df);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  nuniqueSeries(low);
  nuniqueSeries(withNulls, { dropna: false });
  nuniqueDataFrame(df);
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "nunique_fn",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
