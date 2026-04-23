// tsb-side benchmark for Series.sortValues.
// Output: a single JSON line on stdout with the shape
//   {"function": "Series.sortValues", "mean_ms": <number>, "iterations": <number>, "total_ms": <number>}
//
// Dataset shape and iteration counts come from ./config.yaml — keep this file
// and ./benchmark.py in lockstep.

import { Series } from "../../../../src/index.ts";

// Inlined from config.yaml — the autoloop agent should keep these in sync.
// (No YAML parser dependency to keep this benchmark hermetic.)
const DATASET_SIZE = 100_000;
const NAN_RATIO = 0.05;
const WARMUP_ITERATIONS = 5;
const MEASURED_ITERATIONS = 50;
const RANDOM_SEED = 42;

// A tiny deterministic PRNG (mulberry32). Note: this is *not* the same
// algorithm as numpy's default_rng on the Python side, so for any given seed
// the two benchmarks will see different concrete values. They will still see
// the same *distribution* (uniform over [-500_000, 500_000) with the same NaN
// fraction), and that is what matters for a sorting micro-benchmark — the
// dataset shape, not the exact bit pattern. If you ever need byte-identical
// inputs across the two sides, swap mulberry32 for a portable PRNG that has a
// matching numpy implementation (e.g. PCG64).
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildData(): readonly (number | null)[] {
  const rng = mulberry32(RANDOM_SEED);
  const out: (number | null)[] = new Array(DATASET_SIZE);
  for (let i = 0; i < DATASET_SIZE; i++) {
    out[i] = rng() < NAN_RATIO ? null : rng() * 1_000_000 - 500_000;
  }
  return out;
}

function nowMs(): number {
  return performance.now();
}

function main(): void {
  const data = buildData();
  const series = new Series<number | null>({ data, dtype: "float64" });

  // Warm-up — let the JIT specialize.
  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    series.sortValues();
  }

  const start = nowMs();
  for (let i = 0; i < MEASURED_ITERATIONS; i++) {
    series.sortValues();
  }
  const totalMs = nowMs() - start;
  const meanMs = totalMs / MEASURED_ITERATIONS;

  const result = {
    function: "Series.sortValues",
    mean_ms: meanMs,
    iterations: MEASURED_ITERATIONS,
    total_ms: totalMs,
  };
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

main();
