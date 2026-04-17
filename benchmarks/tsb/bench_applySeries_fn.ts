/**
 * Benchmark: applySeries (stats/apply.ts) — element-wise fn receiving (value, label) on 100k-element Series.
 * This is the standalone stats version, distinct from seriesApply (core/pipe_apply.ts).
 * Outputs JSON: {"function": "applySeries_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, applySeries } from "../../src/index.ts";
import type { Scalar, Label } from "../../src/types.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => i * 0.5) });

const fn = (v: Scalar, _label: Label): Scalar => (v as number) * 2 + 1;

for (let i = 0; i < WARMUP; i++) {
  applySeries(s, fn);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  applySeries(s, fn);
  times.push(performance.now() - t0);
}

const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "applySeries_fn",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
