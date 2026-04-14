import { Series } from "tsb";

const words = ["apple", "banana", "cherry", "date", "elderberry"];
const rng = (seed: number) => { let s = seed; return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; }; };
const rand = rng(42);
const data = Array.from({ length: 100_000 }, () => words[Math.floor(rand() * 5)]);
const s = new Series(data);
for (let i = 0; i < 3; i++) s.str.contains("an");
const N = 50;
const t0 = performance.now();
for (let i = 0; i < N; i++) s.str.contains("an");
const elapsed = performance.now() - t0;
console.log(JSON.stringify({ function: "string_contains", mean_ms: elapsed / N, iterations: N, total_ms: elapsed }));
