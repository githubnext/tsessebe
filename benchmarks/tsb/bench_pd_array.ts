/**
 * Benchmark: pdArray / PandasArray — create and iterate typed arrays.
 * Outputs JSON: {"function": "pd_array", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { pdArray } from "../../src/index.js";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 100;

const intData = Array.from({ length: SIZE }, (_, i) => i);
const floatData = Array.from({ length: SIZE }, (_, i) => i * 0.5);
const stringData = Array.from({ length: SIZE }, (_, i) => `item_${i % 100}`);
const mixedData = Array.from({ length: SIZE }, (_, i) => (i % 3 === 0 ? null : i));

function run(): void {
  const a = pdArray(intData, "int64");
  const b = pdArray(floatData, "float64");
  const c = pdArray(stringData, "string");
  const d = pdArray(mixedData);

  // Access elements and iterate
  void a.at(SIZE - 1);
  void b.toArray();
  void c.at(0);
  void d.length;
}

for (let i = 0; i < WARMUP; i++) run();

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) run();
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "pd_array",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
