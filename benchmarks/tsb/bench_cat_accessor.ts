import { Series, CategoricalAccessor } from "../../src/index.js";

const N = 50_000;
const CATS = ["alpha", "beta", "gamma", "delta", "epsilon"] as const;
const data: string[] = Array.from({ length: N }, (_, i) => CATS[i % CATS.length]);
const s = new Series({ data });
const acc = new CategoricalAccessor(s);

// Warm-up
for (let i = 0; i < 10; i++) {
  acc.categories;
  acc.codes;
  acc.addCategories(["zeta"]);
  acc.removeUnusedCategories();
}

const iterations = 100;
const start = performance.now();
for (let i = 0; i < iterations; i++) {
  acc.categories;
  acc.codes;
  acc.addCategories(["zeta"]);
  acc.removeUnusedCategories();
}
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "cat_accessor",
    mean_ms: total_ms / iterations,
    iterations,
    total_ms,
  }),
);
