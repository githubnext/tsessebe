/**
 * Benchmark: pipeChain / pipeTo / dataFramePipeChain / dataFramePipeTo — function chaining utilities.
 * Outputs JSON: {"function": "pipe_chain_ops", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import {
  Series,
  DataFrame,
  pipeChain,
  pipeTo,
  dataFramePipeChain,
  dataFramePipeTo,
  seriesAdd,
  seriesMul,
  seriesAbs,
} from "../../src/index.ts";
import type { Scalar } from "../../src/types.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => i * 0.5 - SIZE * 0.25) });
const df = DataFrame.fromColumns({
  a: Array.from({ length: SIZE }, (_, i) => i * 0.5),
  b: Array.from({ length: SIZE }, (_, i) => i * 0.3 + 1),
});

const double = (x: Series<Scalar>) => seriesMul(x, 2);
const addOne = (x: Series<Scalar>) => seriesAdd(x, 1);
const absVal = (x: Series<Scalar>) => seriesAbs(x);

const dfDouble = (d: DataFrame) => d.mul(2);
const dfAbs = (d: DataFrame) => d.abs();

// pipeTo: insert series at position 0 of a unary function
const identity = (x: Series<Scalar>) => seriesAbs(x);
const dfIdentity = (d: DataFrame) => d.abs();

for (let i = 0; i < WARMUP; i++) {
  pipeChain(s, double, addOne, absVal);
  pipeTo(s, 0, identity);
  dataFramePipeChain(df, dfDouble, dfAbs);
  dataFramePipeTo(df, 0, dfIdentity);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  pipeChain(s, double, addOne, absVal);
  pipeTo(s, 0, identity);
  dataFramePipeChain(df, dfDouble, dfAbs);
  dataFramePipeTo(df, 0, dfIdentity);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "pipe_chain_ops",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
