import { DataFrame } from "tsb";

const rng = (seed: number) => { let s = seed; return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; }; };
const rand = rng(42);
const groups = ["A","B","C","D","E"];
const df = new DataFrame({
  group: Array.from({ length: 100_000 }, () => groups[Math.floor(rand() * 5)]),
  val1: Array.from({ length: 100_000 }, () => (rand() * 2 - 1) * 3),
  val2: Array.from({ length: 100_000 }, () => (rand() * 2 - 1) * 3),
});
for (let i = 0; i < 3; i++) df.groupby("group").agg({ val1: ["mean","std","min","max"], val2: ["sum","count"] });
const N = 30;
const t0 = performance.now();
for (let i = 0; i < N; i++) df.groupby("group").agg({ val1: ["mean","std","min","max"], val2: ["sum","count"] });
const elapsed = performance.now() - t0;
console.log(JSON.stringify({ function: "groupby_agg", mean_ms: elapsed / N, iterations: N, total_ms: elapsed }));
