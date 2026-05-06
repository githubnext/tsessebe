/**
 * Benchmark: cumsum / cumprod / cummax / cummin (Series and DataFrame)
 * Mirrors pandas Series.cumsum(), DataFrame.cumsum(), etc.
 */
import { Series, DataFrame } from "../../src/index.ts";
import {
  cumsum,
  cumprod,
  cummax,
  cummin,
  dataFrameCumsum,
} from "../../src/stats/cum_ops.ts";

const N = 100_000;

// Numeric series for cumsum/cumprod/cummax/cummin
const data = Array.from({ length: N }, (_, i) => (i % 100) + 1);
const series = new Series({ data });

// DataFrame with two columns
const col1 = Array.from({ length: N }, (_, i) => (i % 100) + 1);
const col2 = Array.from({ length: N }, (_, i) => ((i * 3) % 100) + 1);
const df = DataFrame.fromColumns({ a: col1, b: col2 });

const WARMUP = 5;
const ITERS = 20;

// --- warm-up ---
for (let i = 0; i < WARMUP; i++) {
  cumsum(series);
  cummax(series);
  dataFrameCumsum(df);
}

// --- measured: cumsum ---
const t0cs = performance.now();
for (let i = 0; i < ITERS; i++) cumsum(series);
const totalCumsum = performance.now() - t0cs;

// --- measured: cumprod ---
const t0cp = performance.now();
for (let i = 0; i < ITERS; i++) cumprod(series);
const totalCumprod = performance.now() - t0cp;

// --- measured: cummax ---
const t0cx = performance.now();
for (let i = 0; i < ITERS; i++) cummax(series);
const totalCummax = performance.now() - t0cx;

// --- measured: cummin ---
const t0cn = performance.now();
for (let i = 0; i < ITERS; i++) cummin(series);
const totalCummin = performance.now() - t0cn;

// --- measured: dataFrameCumsum ---
const t0df = performance.now();
for (let i = 0; i < ITERS; i++) dataFrameCumsum(df);
const totalDf = performance.now() - t0df;

const total_ms = totalCumsum + totalCumprod + totalCummax + totalCummin + totalDf;
const mean_ms = total_ms / (ITERS * 5);

console.log(
  JSON.stringify({
    function: "cum_ops",
    mean_ms: parseFloat(mean_ms.toFixed(4)),
    iterations: ITERS * 5,
    total_ms: parseFloat(total_ms.toFixed(4)),
  }),
);
