import { Series, DataFrame, squeezeSeries, squeezeDataFrame } from "../../src/index.ts";

const N = 100_000;
// For squeezeSeries: a multi-element Series (returns self unchanged)
const bigSeries = new Series({ data: Float64Array.from({ length: N }, (_, i) => i) });
// For squeezeDataFrame: a single-column DataFrame (axis=1 squeezes to Series)
const singleColDf = DataFrame.fromColumns({ a: Float64Array.from({ length: N }, (_, i) => i) });

// Warm-up
for (let i = 0; i < 20; i++) {
  squeezeSeries(bigSeries);
  squeezeDataFrame(singleColDf, 1);
}

const iterations = 500;
const start = performance.now();
for (let i = 0; i < iterations; i++) {
  squeezeSeries(bigSeries);
  squeezeDataFrame(singleColDf, 1);
}
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "squeeze",
    mean_ms: total_ms / iterations,
    iterations,
    total_ms,
  }),
);
