import { Series, seriesEq, seriesLt, seriesGe } from "../../src/index.ts";

const N = 100_000;
const data = Float64Array.from({ length: N }, (_, i) => i % 1000);
const s = new Series({ data });

// Warm-up
for (let i = 0; i < 20; i++) {
  seriesEq(s, 500);
  seriesLt(s, 300);
  seriesGe(s, 700);
}

const iterations = 300;
const start = performance.now();
for (let i = 0; i < iterations; i++) {
  seriesEq(s, 500);
  seriesLt(s, 300);
  seriesGe(s, 700);
}
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "compare",
    mean_ms: total_ms / iterations,
    iterations,
    total_ms,
  }),
);
