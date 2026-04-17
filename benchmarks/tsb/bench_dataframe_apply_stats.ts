/**
 * Benchmark: dataFrameApply (stats/apply.ts) — apply fn to each column (axis=0) and each row (axis=1)
 * on a 10k-row DataFrame. This is the standalone stats function, not df.apply().
 * Outputs JSON: {"function": "dataframe_apply_stats", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, Series, dataFrameApply } from "../../src/index.ts";
import type { Scalar } from "../../src/types.ts";

const SIZE = 10_000;
const WARMUP = 3;
const ITERATIONS = 20;

const df = DataFrame.fromColumns({
  a: Array.from({ length: SIZE }, (_, i) => i * 1.0),
  b: Array.from({ length: SIZE }, (_, i) => i * 2.0),
  c: Array.from({ length: SIZE }, (_, i) => i * 3.0),
});

const sumFn = (slice: Series<Scalar>) =>
  slice.values.reduce((acc, v) => acc + (v as number), 0) / slice.length;

for (let i = 0; i < WARMUP; i++) {
  dataFrameApply(df, sumFn, { axis: 0 });
  dataFrameApply(df, sumFn, { axis: 1 });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  dataFrameApply(df, sumFn, { axis: 0 });
  dataFrameApply(df, sumFn, { axis: 1 });
  times.push(performance.now() - t0);
}

const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "dataframe_apply_stats",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
