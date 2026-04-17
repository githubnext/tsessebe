/**
 * Benchmark: reindexSeries / reindexDataFrame — realign to a new index.
 * Outputs JSON: {"function": "reindex", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, Index, reindexSeries, reindexDataFrame } from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

// Original: even indices 0, 2, 4, ..., 2*(SIZE-1)
const origLabels = Array.from({ length: SIZE }, (_, i) => i * 2);
const data = Array.from({ length: SIZE }, (_, i) => i * 1.5);
const s = new Series({ data, index: new Index(origLabels) });

// New index: 0..SIZE+1000 (some match, some are new)
const newIndex = Array.from({ length: SIZE + 1000 }, (_, i) => i);

const df = new DataFrame(
  {
    a: data,
    b: data.map((v) => v * 2),
  },
  new Index(origLabels),
);

for (let i = 0; i < WARMUP; i++) {
  reindexSeries(s, newIndex);
  reindexDataFrame(df, { index: newIndex });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  reindexSeries(s, newIndex);
  reindexDataFrame(df, { index: newIndex });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "reindex",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
