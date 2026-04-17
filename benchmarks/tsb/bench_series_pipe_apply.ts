/**
 * Benchmark: pipeSeries / dataFramePipe — pipe function application utilities.
 * Outputs JSON: {"function": "series_pipe_apply", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, pipeSeries, dataFramePipe, seriesAbs, seriesMul } from "../../src/index.ts";
import type { Scalar } from "../../src/types.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => i * 0.5 - SIZE * 0.25) });
const df = DataFrame.fromColumns({
  a: Array.from({ length: SIZE }, (_, i) => i * 0.5),
  b: Array.from({ length: SIZE }, (_, i) => i * 0.3 + 1),
});

const absAndDouble = (x: Series<Scalar>) => seriesMul(seriesAbs(x), 2);
const dfAbsAndDouble = (d: DataFrame) => d.abs().mul(2);

for (let i = 0; i < WARMUP; i++) {
  pipeSeries(s, absAndDouble);
  dataFramePipe(df, dfAbsAndDouble);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  pipeSeries(s, absAndDouble);
  dataFramePipe(df, dfAbsAndDouble);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_pipe_apply",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
