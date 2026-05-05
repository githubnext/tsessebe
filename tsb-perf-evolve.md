# Autoloop: tsb-perf-evolve

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-05-05T07:33:00Z |
| Iteration Count | 35 |
| Best Metric | 21.048 |
| Target Metric | — |
| Metric Direction | lower |
| Branch | autoloop/tsb-perf-evolve |
| PR | — |
| Issue | #189 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, accepted |

## 🧬 Population

### c035 · island 3 · fitness pending CI · gen 35

- **Op**: exploitation; **Cell**: aos-typed-array · non-comparison; **Parent**: c029 (best, fitness 21.048)
- **Approach**: Merge all 8 histogram passes inline into the partition/init loop (eliminates separate O(n) AoS histogram scan) + si stride counters in scatter and gather loops (avoids i*3 multiply) + RangeIndex fast path (bypasses 100k bounds-checked at() calls). Commit 3873563.
- **Status**: ⏳ pending CI

### ~~c030–c034~~ (all pending-CI / lost from branch; same merged-histogram + stride + RangeIndex approach as c035)

### c029 · island 3 · fitness 21.048 · gen 29

- **Approach**: AoS scatter; all 3 writes/element on same cache line. Commit 150c0be.
- **Status**: ✅ accepted CI 25183916807 — tsb=112.50ms / pandas=5.34ms

### ~~c028~~ fitness 21.841 · ~~c027~~ rejected · ~~c022~~ merged PR #226 (LSD 8-pass radix) · ~~c003~~ island 1 fitness 27.999

## 📚 Lessons Learned

- LSD radix (8-pass, IEEE-754 transform) eliminates comparator callbacks; bottleneck at n=100k.
- Module-level TypedArray buffers eliminate GC; grow lazily, never shrink.
- Even pass count (8) → result in srcBuf after all passes (no final copy needed).
- Benchmark noise: pandas time varies (~4-5.5ms); need ≥10% tsb speedup to clear noise.
- AoS scatter packs all 3 writes/element on same cache line; SoA is worse for writes.
- Merging histogram accumulation into init loop saves one O(n) pass over _rxA.
- `index.take(perm)` calls at() with bounds-check; RangeIndex fast path saves 100k calls.
- Accumulated stride counter (si += 3) avoids one multiply per scatter element.

## 🚧 Foreclosed Avenues

- Island 0 (boxed {v,i}): high GC at n=100k.
- BigInt64 packed sort: ~5-10x slower.

## 🔭 Future Directions

- 4-pass 16-bit radix (half passes, 256KB histogram; may hurt L1 cache hit rate).
- Island 4 hybrid: Array.prototype.sort for n < 1k, radix for n ≥ 1k.

## 📊 Iteration History

### Iteration 35 — 2026-05-05 07:33 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25363647445)

- **Status**: ⏳ pending CI · c035 · exploitation · island 3
- **Operator**: exploitation · **Parent**: c029 (fitness 21.048)
- **Change**: Merge all 8 histogram passes into partition/init loop + si stride counters + RangeIndex fast path. Commit 3873563.
- **Metric**: pending CI (best: 21.048)

### Iters 30–34 — ⏳ all pending-CI / lost from branch after PR #262 merge reset · same merged-histogram approach.

### Iteration 29 — 2026-04-30 18:44 UTC

- **Status**: ✅ Accepted fitness=21.048; merged PR #255
- **Change**: AoS scatter layout.

### Iteration 28 — 2026-04-30 01:08 UTC

- **Status**: ✅ Accepted fitness=21.841; merged PR #249
- **Change**: Merge partition+radix-init into one pass.

### Iters 1–27 — c022 ✅ merged PR #226 (LSD 8-pass radix, fitness ~29→21). c027 ❌ fitness=29.573.
