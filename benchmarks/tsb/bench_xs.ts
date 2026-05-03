import { DataFrame, xsDataFrame } from "../../src/index.ts";

const N = 100_000;
const rows = Array.from({ length: N }, (_, i) => i);
const a = Float64Array.from(rows);
const b = Float64Array.from(rows.map((x) => x * 2));
const index = rows.map(String);

const df = DataFrame.fromColumns({ a, b }, { index });

// Warm-up
for (let i = 0; i < 100; i++) {
  xsDataFrame(df, "500");
}

const iterations = 10_000;
const start = performance.now();
for (let i = 0; i < iterations; i++) {
  xsDataFrame(df, String(i % N));
}
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "xs",
    mean_ms: total_ms / iterations,
    iterations,
    total_ms,
  }),
);
