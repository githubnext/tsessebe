import { Series, seriesUpdate } from "../../src/index.ts";

const N = 100_000;
const data = Float64Array.from({ length: N }, (_, i) => i);
const other = Float64Array.from({ length: N }, (_, i) => (i % 3 === 0 ? i * 10 : null as unknown as number));

const s = new Series({ data });
const o = new Series({ data: other });

// Warm-up
for (let i = 0; i < 20; i++) {
  seriesUpdate(s, o);
}

const iterations = 200;
const start = performance.now();
for (let i = 0; i < iterations; i++) {
  seriesUpdate(s, o);
}
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "update",
    mean_ms: total_ms / iterations,
    iterations,
    total_ms,
  }),
);
