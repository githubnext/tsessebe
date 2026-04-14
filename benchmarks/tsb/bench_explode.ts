import { Series } from "tsb";

const rng = (seed: number) => { let s = seed; return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; }; };
const rand = rng(42);
const data = Array.from({ length: 10_000 }, () => {
  const len = Math.floor(rand() * 5) + 1;
  return Array.from({ length: len }, () => Math.floor(rand() * 100));
});
const s = new Series(data);
for (let i = 0; i < 3; i++) s.explode();
const N = 50;
const t0 = performance.now();
for (let i = 0; i < N; i++) s.explode();
const elapsed = performance.now() - t0;
console.log(JSON.stringify({ function: "explode", mean_ms: elapsed / N, iterations: N, total_ms: elapsed }));
