/**
 * Benchmark: SeriesGroupBy .groups / .groupKeys / .ngroups properties on 100k-element Series.
 * Outputs JSON: {"function": "series_groupby_groups", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, SeriesGroupBy } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const categories = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
const data = Array.from({ length: SIZE }, (_, i) => i * 0.1);
const by = Array.from({ length: SIZE }, (_, i) => categories[i % categories.length]);

const s = new Series({ data });
const gb = new SeriesGroupBy(s, by);

for (let i = 0; i < WARMUP; i++) {
  const _g = gb.groups;
  const _k = gb.groupKeys;
  const _n = gb.ngroups;
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  const _g = gb.groups;
  const _k = gb.groupKeys;
  const _n = gb.ngroups;
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;

console.log(
  JSON.stringify({
    function: "series_groupby_groups",
    mean_ms: meanMs,
    iterations: ITERATIONS,
    total_ms: totalMs,
  }),
);
