/**
 * Benchmark: castScalar — type coercion of scalar values to various Dtype kinds.
 * Outputs JSON: {"function": "cast_scalar", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { castScalar, Dtype } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const intDtype = Dtype.from("int64");
const floatDtype = Dtype.from("float64");
const strDtype = Dtype.from("str");
const boolDtype = Dtype.from("bool");

const intValues = Array.from({ length: SIZE }, (_, i) => i % 1000);
const floatValues = Array.from({ length: SIZE }, (_, i) => i * 0.5);
const strValues = Array.from({ length: SIZE }, (_, i) => String(i % 1000));
const boolValues = Array.from({ length: SIZE }, (_, i) => i % 2 === 0);

for (let i = 0; i < WARMUP; i++) {
  for (let j = 0; j < SIZE; j++) {
    castScalar(floatValues[j], intDtype);
    castScalar(intValues[j], floatDtype);
    castScalar(strValues[j], intDtype);
    castScalar(boolValues[j], intDtype);
  }
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  for (let j = 0; j < SIZE; j++) {
    castScalar(floatValues[j], intDtype);
    castScalar(intValues[j], floatDtype);
    castScalar(strValues[j], intDtype);
    castScalar(boolValues[j], intDtype);
  }
  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "cast_scalar",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
