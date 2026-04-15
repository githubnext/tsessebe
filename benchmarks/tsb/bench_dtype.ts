/**
 * Benchmark: Dtype — singleton lookup, inferFrom, commonType, and property access
 */
import { Dtype } from "../../src/index.js";

const WARMUP = 3;
const ITERATIONS = 10_000;

const values = Array.from({ length: 100 }, (_, i) => i * 1.5);
const mixed = [1, 2.5, "hello", true];

for (let i = 0; i < WARMUP; i++) {
  Dtype.from("float64");
  Dtype.inferFrom(values);
  Dtype.commonType(Dtype.float32, Dtype.float64);
  const dt = Dtype.from("float64");
  dt.isNumeric; dt.isFloat; dt.isInteger; dt.kind; dt.itemsize;
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  Dtype.from("float64");
  Dtype.inferFrom(values);
  Dtype.commonType(Dtype.float32, Dtype.float64);
  const dt = Dtype.from("float64");
  dt.isNumeric; dt.isFloat; dt.isInteger; dt.kind; dt.itemsize;
}
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "dtype",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
