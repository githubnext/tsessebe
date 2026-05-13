/**
 * Benchmark: FixedForwardWindowIndexer and VariableOffsetWindowIndexer on 100k rows
 */
import { FixedForwardWindowIndexer, VariableOffsetWindowIndexer } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const offsets = Int32Array.from({ length: ROWS }, (_, i) => 3 + (i % 5));

const fixedIdx = new FixedForwardWindowIndexer({ windowSize: 10 });
const varIdx = new VariableOffsetWindowIndexer({ indexArray: offsets });

// Warm up
for (let i = 0; i < WARMUP; i++) {
  fixedIdx.getWindowBounds(ROWS);
  varIdx.getWindowBounds(ROWS);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  fixedIdx.getWindowBounds(ROWS);
  varIdx.getWindowBounds(ROWS);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "indexers",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
