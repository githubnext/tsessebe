/**
 * Benchmark: toNumericScalar — coerce individual scalars to numeric values.
 * Outputs JSON: {"function": "to_numeric_scalar", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { toNumericScalar } from "../../src/index.ts";

const WARMUP = 5;
const ITERATIONS = 100;
const BATCH = 10_000;

const inputs: unknown[] = Array.from({ length: BATCH }, (_, i) => {
  const r = i % 6;
  if (r === 0) return String(i * 1.5);
  if (r === 1) return i;
  if (r === 2) return `  ${i}  `;
  if (r === 3) return true;
  if (r === 4) return null;
  return String(i);
});

for (let i = 0; i < WARMUP; i++) {
  for (const v of inputs) toNumericScalar(v, { errors: "coerce" });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  for (const v of inputs) toNumericScalar(v, { errors: "coerce" });
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "to_numeric_scalar",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
