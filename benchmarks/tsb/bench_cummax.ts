import { Series } from "tsb";

const rng = (seed: number) => { let s = seed; return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return ((s >>> 0) / 0xffffffff) * 2 - 1; }; };
const rand = rng(42);
const data = Array.from({ length: 100_000 }, () => rand() * 3);
const s = new Series(data);
for (let i = 0; i < 3; i++) s.cummax();
const N = 100;
const t0 = performance.now();
for (let i = 0; i < N; i++) s.cummax();
const elapsed = performance.now() - t0;
console.log(JSON.stringify({ function: "cummax", mean_ms: elapsed / N, iterations: N, total_ms: elapsed }));
