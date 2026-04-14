import { Series } from "tsb";

const rng = (seed: number) => { let s = seed; return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; }; };
const rand = rng(42);
const data = Array.from({ length: 100_000 }, () => Math.floor(rand() * 10));
const s = new Series(data);
const mapping = new Map(Array.from({ length: 10 }, (_, i) => [i, i * 10] as [number, number]));
for (let i = 0; i < 3; i++) s.replace(mapping);
const N = 50;
const t0 = performance.now();
for (let i = 0; i < N; i++) s.replace(mapping);
const elapsed = performance.now() - t0;
console.log(JSON.stringify({ function: "series_replace", mean_ms: elapsed / N, iterations: N, total_ms: elapsed }));
