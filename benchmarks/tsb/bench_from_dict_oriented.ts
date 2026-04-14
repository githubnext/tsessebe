/**
 * Benchmark: fromDictOriented (records orient) on 10k records
 */
import { fromDictOriented } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 3;
const ITERATIONS = 10;
const records = Array.from({ length: ROWS }, (_, i) => ({ id: i, val: i * 1.5, name: `item_${i}` }));

for (let i = 0; i < WARMUP; i++) fromDictOriented({ orient: "records", data: records });
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) fromDictOriented({ orient: "records", data: records });
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "from_dict_oriented",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
