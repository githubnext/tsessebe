/**
 * Benchmark: EWM with adjust=false — IIR-based exponential weighted mean vs default adjust=true on 100k Series.
 * Outputs JSON: {"function": "ewm_adjust", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 20;

const data = Array.from({ length: SIZE }, (_, i) => Math.sin(i * 0.01) * 100);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.ewm({ alpha: 0.3, adjust: false }).mean();
  s.ewm({ alpha: 0.3, adjust: true }).mean();
  s.ewm({ span: 20, adjust: false }).mean();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.ewm({ alpha: 0.3, adjust: false }).mean();
  s.ewm({ alpha: 0.3, adjust: true }).mean();
  s.ewm({ span: 20, adjust: false }).mean();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "ewm_adjust",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
