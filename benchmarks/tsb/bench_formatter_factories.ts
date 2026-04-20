/**
 * Benchmark: makeFloatFormatter / makePercentFormatter / makeCurrencyFormatter
 * — create formatter functions and apply each to a 100k-element Series.
 * Outputs JSON: {"function": "formatter_factories", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import {
  Series,
  makeFloatFormatter,
  makePercentFormatter,
  makeCurrencyFormatter,
  applySeriesFormatter,
} from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

const data = Array.from({ length: SIZE }, (_, i) => i * 0.0001234);
const s = new Series({ data });

const floatFmt = makeFloatFormatter(3);
const pctFmt = makePercentFormatter(1);
const currFmt = makeCurrencyFormatter("€", 2);

for (let i = 0; i < WARMUP; i++) {
  applySeriesFormatter(s, floatFmt);
  applySeriesFormatter(s, pctFmt);
  applySeriesFormatter(s, currFmt);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  applySeriesFormatter(s, floatFmt);
  applySeriesFormatter(s, pctFmt);
  applySeriesFormatter(s, currFmt);
  times.push(performance.now() - t0);
}

const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "formatter_factories",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
