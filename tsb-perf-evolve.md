# Autoloop: tsb-perf-evolve

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-05-02T06:53:50Z |
| Iteration Count | 31 |
| Best Metric | 21.048 |
| Target Metric | — |
| Metric Direction | lower |
| Branch | autoloop/tsb-perf-evolve |
| PR | #262 |
| Issue | #189 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, accepted, rejected, pending-ci, pending-ci, pending-ci |

## 🧬 Population

### c031 · island 3 · fitness pending CI · gen 31

- **Op**: exploitation; **Cell**: aos-typed-array · non-comparison; **Parent**: c030
- **Approach**: Merged histogram into init loop + RangeIndex fast path for take(perm). Commit e99cc8d.
- **Status**: ⏳ pending CI

### ~~c030~~ (CI action_required; changes rolled into c031) · gen 30

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
- `index.take(perm)` calls at() with bounds-check for each element; RangeIndex fast path saves this.

## 🚧 Foreclosed Avenues

- Island 0 (boxed {v,i}): high GC at n=100k.
- BigInt64 packed sort: ~5-10x slower.

## 🔭 Future Directions

- 4-pass 16-bit radix (half passes, 256KB histogram; may hurt L1 cache hit rate).
- Island 4 hybrid: Array.prototype.sort for n < 1k, radix for n ≥ 1k.

## 📊 Iteration History

### Iteration 31 — 2026-05-02 06:53 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25246208804)

- **Status**: ⏳ pending CI · c031 · exploitation · island 3
- **Change**: Merged histogram into init loop + RangeIndex fast path for index.take(perm).

### Iteration 30 — 2026-05-01 12:36 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25214403845)

- **Status**: ⏳ pending CI (CI action_required) · c030 · exploitation · island 3
- **Change**: Pre-compute all 8 histograms in one O(n) scan.

### Iteration 29 — 2026-04-30 18:44 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25183052353)

- **Status**: ✅ Accepted fitness=21.048 delta=-0.793; merged PR #255
- **Change**: AoS scatter layout.

### Iteration 28 — 2026-04-30 01:08 UTC

- **Status**: ✅ Accepted fitness=21.841 delta=-6.158; merged PR #249
- **Change**: Merge partition+radix-init into one pass.

### Iters 1–27 — c022 ✅ merged PR #226 (LSD 8-pass radix). c027 ❌ fitness=29.573.
