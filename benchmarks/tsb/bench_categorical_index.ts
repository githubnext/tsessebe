/**
 * Benchmark: CategoricalIndex — creation, getLoc, addCategories, set operations on 100k elements.
 * Outputs JSON: {"function": "categorical_index", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { CategoricalIndex } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

const CATS = ["alpha", "beta", "gamma", "delta", "epsilon"];
const labels = Array.from({ length: SIZE }, (_, i) => CATS[i % CATS.length]);
const ci = CategoricalIndex.fromArray(labels);
const ci2 = CategoricalIndex.fromArray(
  Array.from({ length: SIZE / 2 }, (_, i) => CATS[(i + 2) % CATS.length]),
);

for (let i = 0; i < WARMUP; i++) {
  CategoricalIndex.fromArray(labels);
  ci.getLoc("beta");
  ci.getLocsAll("gamma");
  ci.addCategories(["zeta"]);
  ci.unionCategories(ci2);
  ci.intersectCategories(ci2);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  CategoricalIndex.fromArray(labels);
  ci.getLoc("beta");
  ci.getLocsAll("gamma");
  ci.addCategories(["zeta"]);
  ci.unionCategories(ci2);
  ci.intersectCategories(ci2);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "categorical_index",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
