import { Series, DataFrame, hashPandasObject } from "../../src/index.ts";

const N = 10_000;
const nums = Float64Array.from({ length: N }, (_, i) => i);
const strs: string[] = Array.from({ length: N }, (_, i) => `label_${i}`);

const numSeries = new Series({ data: nums });
const df = DataFrame.fromColumns({ a: nums, b: strs });

// Warm-up
for (let i = 0; i < 10; i++) {
  hashPandasObject(numSeries);
  hashPandasObject(df);
}

const iterations = 50;
const start = performance.now();
for (let i = 0; i < iterations; i++) {
  hashPandasObject(numSeries);
  hashPandasObject(df);
}
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "hash_pandas_object",
    mean_ms: total_ms / iterations,
    iterations,
    total_ms,
  }),
);
