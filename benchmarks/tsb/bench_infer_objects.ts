import { Series, DataFrame, inferObjectsSeries, inferObjectsDataFrame } from "../../src/index.ts";

const N = 100_000;
// Object-dtype series with mixed integer values (infer_objects will infer int dtype)
const objectData: (number | null)[] = Array.from({ length: N }, (_, i) => (i % 10 === 0 ? null : i));
const objSeries = new Series({ data: objectData });
const objDf = DataFrame.fromColumns({ a: objectData, b: objectData.map((v) => (v !== null ? v * 2 : null)) });

// Warm-up
for (let i = 0; i < 10; i++) {
  inferObjectsSeries(objSeries, { objectOnly: false });
  inferObjectsDataFrame(objDf, { objectOnly: false });
}

const iterations = 100;
const start = performance.now();
for (let i = 0; i < iterations; i++) {
  inferObjectsSeries(objSeries, { objectOnly: false });
  inferObjectsDataFrame(objDf, { objectOnly: false });
}
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "infer_objects",
    mean_ms: total_ms / iterations,
    iterations,
    total_ms,
  }),
);
