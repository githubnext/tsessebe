/**
 * Benchmark: resolveFreq — frequency string-to-offset resolution on many inputs.
 * Outputs JSON: {"function": "resolve_freq", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { resolveFreq } from "../../src/index.ts";

const WARMUP = 5;
const ITERATIONS = 1_000;

// Various frequency strings to resolve
const freqs = ["D", "h", "min", "s", "ms", "ME", "QE", "YE", "W", "B"] as const;

for (let i = 0; i < WARMUP; i++) {
  for (const f of freqs) {
    resolveFreq(f);
    resolveFreq(f, 2);
  }
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  for (const f of freqs) {
    resolveFreq(f);
    resolveFreq(f, 2);
  }
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "resolve_freq",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
