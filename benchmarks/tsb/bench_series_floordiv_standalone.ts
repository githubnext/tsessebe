/**
 * Benchmark: seriesFloorDiv / seriesMod / seriesPow — standalone floor-division, modulo, and power on 100k Series.
 * Outputs JSON: {"function": "series_floordiv_standalone", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, seriesFloorDiv, seriesMod, seriesPow } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => (i % 1000) + 1) });

for (let i = 0; i < WARMUP; i++) {
  seriesFloorDiv(s, 3);
  seriesMod(s, 7);
  seriesPow(s, 2);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  seriesFloorDiv(s, 3);
  seriesMod(s, 7);
  seriesPow(s, 2);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_floordiv_standalone",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
