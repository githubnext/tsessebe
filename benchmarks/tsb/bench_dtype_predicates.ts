/**
 * Benchmark: dtype predicate functions — isNumericDtype, isIntegerDtype, isFloatDtype,
 * isBoolDtype, isStringDtype, isDatetimeDtype, isCategoricalDtype, isSignedIntegerDtype,
 * isUnsignedIntegerDtype, isTimedeltaDtype, isObjectDtype, isComplexDtype,
 * isExtensionArrayDtype, isPeriodDtype, isIntervalDtype
 */
import {
  isNumericDtype,
  isIntegerDtype,
  isFloatDtype,
  isBoolDtype,
  isStringDtype,
  isDatetimeDtype,
  isCategoricalDtype,
  isSignedIntegerDtype,
  isUnsignedIntegerDtype,
  isTimedeltaDtype,
  isObjectDtype,
  isComplexDtype,
  isExtensionArrayDtype,
  isPeriodDtype,
  isIntervalDtype,
} from "../../src/index.js";

const WARMUP = 3;
const ITERATIONS = 10_000;

const dtypes = ["float64", "int32", "uint8", "bool", "string", "datetime", "category", "object", "timedelta"] as const;

function runChecks(): void {
  for (const d of dtypes) {
    isNumericDtype(d);
    isIntegerDtype(d);
    isFloatDtype(d);
    isBoolDtype(d);
    isStringDtype(d);
    isDatetimeDtype(d);
    isCategoricalDtype(d);
    isSignedIntegerDtype(d);
    isUnsignedIntegerDtype(d);
    isTimedeltaDtype(d);
    isObjectDtype(d);
    isComplexDtype(d);
    isExtensionArrayDtype(d);
    isPeriodDtype(d);
    isIntervalDtype(d);
  }
}

for (let i = 0; i < WARMUP; i++) runChecks();

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) runChecks();
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dtype_predicates",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
