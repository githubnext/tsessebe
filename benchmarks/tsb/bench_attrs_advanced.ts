/**
 * Benchmark: advanced attrs helpers — getAttr/setAttr/deleteAttr/clearAttrs/copyAttrs/mergeAttrs/hasAttrs
 */
import { Series, getAttr, setAttr, deleteAttr, clearAttrs, copyAttrs, mergeAttrs, hasAttrs } from "../../src/index.js";

const N = 1_000;
const s = new Series({ data: Array.from({ length: N }, (_, i) => i) });
const s2 = new Series({ data: Array.from({ length: N }, (_, i) => i * 2) });

const WARMUP = 3;
const ITERATIONS = 1_000;

for (let i = 0; i < WARMUP; i++) {
  setAttr(s, "unit", "meters");
  getAttr(s, "unit");
  hasAttrs(s);
  copyAttrs(s, s2);
  mergeAttrs(s, { version: 1 });
  deleteAttr(s, "unit");
  clearAttrs(s);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  setAttr(s, "unit", "meters");
  getAttr(s, "unit");
  hasAttrs(s);
  copyAttrs(s, s2);
  mergeAttrs(s, { version: i });
  deleteAttr(s, "unit");
  clearAttrs(s);
}
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "attrs_advanced",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
