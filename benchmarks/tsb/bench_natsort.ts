/**
 * Benchmark: natSorted, natCompare, natSortKey, natArgSort on 10k strings
 *
 * Mirrors Python `natsort` package usage: natural-order sorting of strings
 * with embedded numeric tokens (e.g. "file10" sorts after "file9").
 */
import { natSorted, natCompare, natSortKey, natArgSort } from "../../src/index.js";

const N = 10_000;
const WARMUP = 3;
const ITERATIONS = 10;

// Build an array of strings with numeric suffixes (out of natural order)
const items = Array.from({ length: N }, (_, i) => `item${N - i}`);

// Warm-up
for (let i = 0; i < WARMUP; i++) {
  natSorted(items);
  natCompare("file10", "file9");
  natSortKey("file42");
  natArgSort(items);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  natSorted(items);
  natCompare("file10", "file9");
  natSortKey("file42");
  natArgSort(items);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "natsort",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
