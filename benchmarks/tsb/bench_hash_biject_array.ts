import { hashBijectArray, hashBijectInverse } from "../../src/index.js";

const N = 50_000;
const data: (string | number)[] = Array.from({ length: N }, (_, i) =>
  i % 2 === 0 ? `label_${i % 1000}` : i % 1000,
);

// Warm-up
for (let i = 0; i < 10; i++) {
  const codes = hashBijectArray(data);
  hashBijectInverse(codes);
}

const iterations = 50;
const start = performance.now();
for (let i = 0; i < iterations; i++) {
  const codes = hashBijectArray(data);
  hashBijectInverse(codes);
}
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "hash_biject_array",
    mean_ms: total_ms / iterations,
    iterations,
    total_ms,
  }),
);
