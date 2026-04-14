/**
 * Benchmark: pipe with 3 transforms on a 100k-element Series
 */
import { Series, pipe } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;
const data = Array.from({ length: ROWS }, (_, i) => i * 0.5);
const s = new Series({ data });

const double = (x: Series) => x.mul(2);
const addOne = (x: Series) => x.add(1);
const absVal = (x: Series) => x.abs();

for (let i = 0; i < WARMUP; i++) pipe(s, double, addOne, absVal);
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) pipe(s, double, addOne, absVal);
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "pipe_bench",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
