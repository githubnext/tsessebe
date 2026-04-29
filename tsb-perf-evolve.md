# Autoloop: tsb-perf-evolve

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-29T22:51:44Z |
| Iteration Count | 27 |
| Best Metric | 27.999 |
| Target Metric | — |
| Metric Direction | lower |
| Branch | autoloop/tsb-perf-evolve |
| PR | pending CI |
| Issue | #189 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, pending-ci |

## 🧬 Population

### c027 · island 3 · fitness pending CI · gen 27

- **Op**: exploitation; **Cell**: parallel-typed-arrays · non-comparison; **Parent**: c022/main
- **Approach**: Make `_finBuf`, `_nanBuf`, `_fvals`, `_fvalsU32` module-level grow-on-demand. Eliminates 1.6MB TypedArray GC per call (80MB for 50 bench iters). Commit 7f42e5a.
- **Status**: ⏳ pending CI

### ~~c026~~ (lost — branch was reset to main; same idea re-applied as c027)

### ~~c022~~ (merged via PR #226 — LSD 8-pass radix, all rx module-level)

### c003 · island 1 · fitness 27.999 · gen 2

- **Cell**: parallel-typed-arrays · comparison; tsb=155.63ms / pandas=5.56ms
- **Status**: ✅ accepted CI 24843983915

## 📚 Lessons Learned

- LSD radix (8-pass, IEEE-754 transform) eliminates all comparator callbacks; the bottleneck at n=100k.
- Module-level TypedArray buffers eliminate GC pressure; grow lazily, never shrink.
- `noUncheckedIndexedAccess`: use `!` on TypedArray[i]. `arr[i]!++` invalid; use `const v=arr[i]!; arr[i]=v+1`.
- Fast-forward branch to origin/main before committing to prevent phantom commits.
- Keys indexed by ROW simplifies scatter: `curB[cv] = r`. Even pass count → result in srcIdx after 8 passes.
- `new Uint32Array(fvals.buffer)` valid TypeScript; update `_fvalsU32` whenever `_fvals` is reallocated.
- Pending-CI pattern: sandbox has no `bun`; CI benchmark is the acceptance gate.

## 🚧 Foreclosed Avenues

- Island 0 (boxed {v,i}): high GC at n=100k.
- BigInt64 packed sort: ~5-10x slower.

## 🔭 Future Directions

- 4-pass 16-bit radix (half passes, 64KB histogram, cache effects unknown).
- Interleaved key layout: [lo0, hi0, lo1, hi1, ...] for better spatial locality.
- Island 4 (hybrid): Array.prototype.sort for n < 1000, radix for n ≥ 1000.

## 📊 Iteration History

### Iteration 27 — 2026-04-29 22:51 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25137904374)

- **Status**: ⏳ pending CI · **Op**: exploitation · **Island**: 3 · c027
- **Change**: _finBuf/_nanBuf/_fvals/_fvalsU32 → module-level grow-on-demand (was per-call). Eliminates 1.6MB TypedArray GC per call. Commit 7f42e5a.
- **Metric**: pending CI (sandbox has no bun)

### Iteration 26 — 2026-04-29 13:23 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25111403382)

- **Status**: ⏳ pending CI · **Op**: exploitation · **Island**: 3 · c026
- **Change**: _finBuf/_nanBuf/_fvals/_fvalsU32 → module-level grow-on-demand (was per-call). Eliminates 1.6MB TypedArray GC per call. Commit 18b2b79.
- **Metric**: pending CI (sandbox has no bun)

### Iters 1–25 — 2026-04-23–28 — c003 ✅ fitness=27.999 (tsb=155.63ms, pandas=5.56ms). c022 ✅ merged PR #226 (LSD 8-pass radix). Others pending-ci or lost to branch resets.
