import { hashArray } from "../../src/index.js";

const N = 100_000;
const arr: (string | number | null)[] = Array.from({ length: N }, (_, i) =>
  i % 10 === 0 ? null : i % 3 === 0 ? `str_${i}` : i,
);

// Warm-up
for (let i = 0; i < 5; i++) hashArray(arr);

const ITERS = 20;
const start = performance.now();
for (let i = 0; i < ITERS; i++) hashArray(arr);
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "hash_array",
    mean_ms: total / ITERS,
    iterations: ITERS,
    total_ms: total,
  }),
);
