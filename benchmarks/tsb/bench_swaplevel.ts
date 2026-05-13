import { MultiIndex, Series, swapLevelSeries, reorderLevelsSeries } from "../../src/index.js";

const N = 50_000;
const levA = Array.from({ length: N }, (_, i) => `a${i % 100}`);
const levB = Array.from({ length: N }, (_, i) => i % 500);
const levC = Array.from({ length: N }, (_, i) => i % 10);
const tuples: [string, number, number][] = levA.map((v, i) => [v, levB[i], levC[i]]);
const idx = new MultiIndex({ tuples });
const s = new Series<number>({ data: Array.from({ length: N }, (_, i) => i), index: idx });

// Warm-up
for (let i = 0; i < 3; i++) {
  swapLevelSeries(s, 0, 1);
  reorderLevelsSeries(s, [2, 0, 1]);
}

const ITERS = 20;
const start = performance.now();
for (let i = 0; i < ITERS; i++) {
  swapLevelSeries(s, 0, 1);
  reorderLevelsSeries(s, [2, 0, 1]);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "swaplevel",
    mean_ms: total / ITERS,
    iterations: ITERS,
    total_ms: total,
  }),
);
