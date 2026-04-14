import { Series } from "tsb";

// minute-resolution timestamps for 100k points starting 2020-01-01
const base = new Date("2020-01-01T00:00:00Z").getTime();
const idx = Array.from({ length: 100_000 }, (_, i) => new Date(base + i * 60_000));
const rng = (seed: number) => { let s = seed; return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return ((s >>> 0) / 0xffffffff) * 2 - 1; }; };
const rand = rng(42);
const data = Array.from({ length: 100_000 }, () => rand() * 3);
const s = new Series(data, { index: idx });
for (let i = 0; i < 3; i++) s.resample("1h").mean();
const N = 50;
const t0 = performance.now();
for (let i = 0; i < N; i++) s.resample("1h").mean();
const elapsed = performance.now() - t0;
console.log(JSON.stringify({ function: "resample", mean_ms: elapsed / N, iterations: N, total_ms: elapsed }));
