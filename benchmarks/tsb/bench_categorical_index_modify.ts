/**
 * Benchmark: CategoricalIndex modification — renameCategories, reorderCategories, removeCategories,
 * setCategories, removeUnusedCategories, asOrdered/asUnordered on a 10k-element index.
 * Outputs JSON: {"function": "categorical_index_modify", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { CategoricalIndex } from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

const CATS = ["alpha", "beta", "gamma", "delta", "epsilon"];
const labels = Array.from({ length: SIZE }, (_, i) => CATS[i % CATS.length]);
const ci = CategoricalIndex.fromArray(labels);

for (let i = 0; i < WARMUP; i++) {
  ci.renameCategories(["A", "B", "C", "D", "E"]);
  ci.reorderCategories(["epsilon", "delta", "gamma", "beta", "alpha"]);
  ci.removeCategories(["epsilon"]);
  ci.setCategories(["alpha", "beta", "gamma"]);
  ci.removeUnusedCategories();
  ci.asOrdered();
  ci.asUnordered();
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  ci.renameCategories(["A", "B", "C", "D", "E"]);
  ci.reorderCategories(["epsilon", "delta", "gamma", "beta", "alpha"]);
  ci.removeCategories(["epsilon"]);
  ci.setCategories(["alpha", "beta", "gamma"]);
  ci.removeUnusedCategories();
  ci.asOrdered();
  ci.asUnordered();
  times.push(performance.now() - t0);
}

const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "categorical_index_modify",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
