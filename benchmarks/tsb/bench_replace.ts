/**
 * Benchmark: replaceSeries / replaceDataFrame
 * Mirrors pandas Series.replace() and DataFrame.replace().
 */
import { Series, DataFrame } from "../../src/index.ts";
import { replaceSeries, replaceDataFrame } from "../../src/stats/replace.ts";

const N = 100_000;

// Build a numeric series with values 0–9 (cycled) for scalar replace
const data = Array.from({ length: N }, (_, i) => i % 10);
const series = new Series({ data });

// Build a DataFrame with two numeric columns
const col1 = Array.from({ length: N }, (_, i) => i % 10);
const col2 = Array.from({ length: N }, (_, i) => (i * 3) % 10);
const df = DataFrame.fromColumns({ a: col1, b: col2 });

const WARMUP = 5;
const ITERS = 20;

// --- warm-up ---
for (let i = 0; i < WARMUP; i++) {
  replaceSeries(series, { toReplace: 5, value: 99 });
  replaceDataFrame(df, { toReplace: 5, value: 99 });
}

// --- measured: replaceSeries scalar ---
const t0s = performance.now();
for (let i = 0; i < ITERS; i++) {
  replaceSeries(series, { toReplace: i % 10, value: 99 });
}
const totalSeries = performance.now() - t0s;

// --- measured: replaceDataFrame scalar ---
const t0d = performance.now();
for (let i = 0; i < ITERS; i++) {
  replaceDataFrame(df, { toReplace: i % 10, value: 99 });
}
const totalDf = performance.now() - t0d;

// Report the average of the two operations
const total_ms = totalSeries + totalDf;
const mean_ms = total_ms / (ITERS * 2);

console.log(
  JSON.stringify({
    function: "replace",
    mean_ms: parseFloat(mean_ms.toFixed(4)),
    iterations: ITERS * 2,
    total_ms: parseFloat(total_ms.toFixed(4)),
  }),
);
