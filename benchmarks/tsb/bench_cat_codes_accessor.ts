/**
 * Benchmark: CategoricalAccessor.codes / nCategories / ordered — category accessor
 * properties on a 100k-element categorical Series.
 * Outputs JSON: {"function": "cat_codes_accessor", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series } from "../../src/index.ts";

const SIZE = 100_000;
const CATS = 50;
const WARMUP = 5;
const ITERATIONS = 30;

const categories = Array.from({ length: CATS }, (_, i) => `cat_${i}`);
const data = Array.from({ length: SIZE }, (_, i) => categories[i % CATS]);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  void s.cat.codes;
  void s.cat.nCategories;
  void s.cat.ordered;
  void s.cat.categories;
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  void s.cat.codes;
  void s.cat.nCategories;
  void s.cat.ordered;
  void s.cat.categories;
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "cat_codes_accessor",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
