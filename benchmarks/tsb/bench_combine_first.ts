import { Series } from "tsb";

const rng = (seed: number) => { let s = seed; return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return ((s >>> 0) / 0xffffffff) * 2 - 1; }; };
const rand = rng(42);
const d1: (number | null)[] = Array.from({ length: 100_000 }, (_, i) => i % 3 === 0 ? null : rand() * 3);
const d2 = Array.from({ length: 100_000 }, () => rand() * 3);
const s1 = new Series(d1);
const s2 = new Series(d2);
for (let i = 0; i < 3; i++) s1.combineFirst(s2);
const N = 50;
const t0 = performance.now();
for (let i = 0; i < N; i++) s1.combineFirst(s2);
const elapsed = performance.now() - t0;
console.log(JSON.stringify({ function: "combine_first", mean_ms: elapsed / N, iterations: N, total_ms: elapsed }));
