/**
 * Benchmark: series_shift — shift values by 1 position in a 100k-element Series
 *
 * Note: tsb does not have a built-in shift method yet, so we implement the
 * equivalent operation manually (prepend null, drop last element).
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 5;
const ITERATIONS = 20;

const data = Array.from({ length: ROWS }, (_, i) => i * 1.0);
const s = new Series({ data });

/** Shift a numeric Series by 1 position, filling with null. */
function shiftSeries(series: Series<number>): Series<number | null> {
  const vals = series.toArray();
  const shifted: (number | null)[] = [null];
  for (let i = 0; i < vals.length - 1; i++) {
    const v = vals[i];
    if (v !== undefined) {
      shifted.push(v);
    }
  }
  return new Series({ data: shifted });
}

for (let i = 0; i < WARMUP; i++) {
  shiftSeries(s);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  shiftSeries(s);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_shift",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
