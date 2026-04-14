import { DataFrame } from "tsb";

const rows = 100;
const cols = 20;
const rng = (seed: number) => { let s = seed; return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return ((s >>> 0) / 0xffffffff) * 2 - 1; }; };
const rand = rng(42);
const rowArr: number[] = [];
const colArr: number[] = [];
const valArr: number[] = [];
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    rowArr.push(r);
    colArr.push(c);
    valArr.push(rand() * 3);
  }
}
const df = new DataFrame({ row: rowArr, col: colArr, val: valArr });
for (let i = 0; i < 3; i++) df.pivot({ index: "row", columns: "col", values: "val" });
const N = 100;
const t0 = performance.now();
for (let i = 0; i < N; i++) df.pivot({ index: "row", columns: "col", values: "val" });
const elapsed = performance.now() - t0;
console.log(JSON.stringify({ function: "pivot", mean_ms: elapsed / N, iterations: N, total_ms: elapsed }));
