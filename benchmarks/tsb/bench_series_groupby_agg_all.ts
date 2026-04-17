/**
 * Benchmark: SeriesGroupBy — all aggregation operations (sum/mean/std/min/max/count/first/last) on 100k Series.
 * Outputs JSON: {"function": "series_groupby_agg_all", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => (i * 1.5) % 9999) });
const by = new Series({ data: Array.from({ length: SIZE }, (_, i) => i % 100) });
const gb = s.groupby(by);

for (let i = 0; i < WARMUP; i++) {
  gb.sum();
  gb.mean();
  gb.std();
  gb.min();
  gb.max();
  gb.count();
  gb.first();
  gb.last();
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  gb.sum();
  gb.mean();
  gb.std();
  gb.min();
  gb.max();
  gb.count();
  gb.first();
  gb.last();
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "series_groupby_agg_all",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
