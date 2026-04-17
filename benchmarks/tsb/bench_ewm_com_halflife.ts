/**
 * Benchmark: EWM with com and halflife decay parameters (vs existing span/alpha benches).
 * Outputs JSON: {"function": "ewm_com_halflife", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series } from "../../src/index.ts";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.05));
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.ewm({ com: 9 }).mean();
  s.ewm({ halflife: 10 }).mean();
  s.ewm({ com: 5 }).std();
  s.ewm({ halflife: 7 }).var();
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  s.ewm({ com: 9 }).mean();
  s.ewm({ halflife: 10 }).mean();
  s.ewm({ com: 5 }).std();
  s.ewm({ halflife: 7 }).var();
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "ewm_com_halflife",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
