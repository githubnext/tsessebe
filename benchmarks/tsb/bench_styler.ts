/**
 * Benchmark: Styler — highlight max/min and background gradient on a 1000-row DataFrame
 */
import { DataFrame, dataFrameStyle } from "../../src/index.js";

const N = 1_000;
const WARMUP = 2;
const ITERATIONS = 5;

const a = Array.from({ length: N }, (_, i) => i * 1.0);
const b = Array.from({ length: N }, (_, i) => (N - i) * 2.0);
const c = Array.from({ length: N }, (_, i) => Math.sin(i / 100) * 100);
const df = DataFrame.fromColumns({ a, b, c });

for (let i = 0; i < WARMUP; i++) {
  dataFrameStyle(df).highlightMax().highlightMin().backgroundGradient().exportStyles();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  dataFrameStyle(df).highlightMax().highlightMin().backgroundGradient().exportStyles();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "styler",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
