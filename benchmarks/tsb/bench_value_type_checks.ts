/**
 * Benchmark: extended value type predicates — isNumber, isBool, isStringValue,
 * isFloat, isInteger, isBigInt, isRegExp, isReCompilable, isMissing, isHashable, isDate
 */
import {
  isNumber,
  isBool,
  isStringValue,
  isFloat,
  isInteger,
  isBigInt,
  isRegExp,
  isReCompilable,
  isMissing,
  isHashable,
  isDate,
} from "../../src/index.js";

const WARMUP = 3;
const ITERATIONS = 10_000;

const mixed = [42, 3.14, true, "hello", null, undefined, BigInt(9007199254740993), /abc/i, new Date(), { a: 1 }];

function runChecks(): void {
  for (const v of mixed) {
    isNumber(v);
    isBool(v);
    isStringValue(v);
    isFloat(v);
    isInteger(v);
    isBigInt(v);
    isRegExp(v);
    isReCompilable(v);
    isMissing(v);
    isHashable(v);
    isDate(v);
  }
}

for (let i = 0; i < WARMUP; i++) runChecks();

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) runChecks();
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "value_type_checks",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
