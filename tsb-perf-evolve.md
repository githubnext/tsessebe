# Autoloop: tsb-perf-evolve

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-27T01:24:00Z |
| Iteration Count | 23 |
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
| Recent Statuses | pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, not-pushed |

## 🧬 Population

### c023 · island 3 · fitness pending CI · gen 23

- **Op**: exploitation (c022/main as parent); **Cell**: parallel-typed-arrays · non-comparison; **Parent**: c022
- **Approach**: Same LSD 8-pass radix as c022 (now in main) but also make `finBuf` (400KB), `nanBuf` (400KB), `fvals` (800KB), and `fvalsU32` (view) module-level grow-on-demand buffers. Eliminates 1.6MB of TypedArray GC per sort call (80MB total across 50 bench iterations). Commit 1b603f1.
- **Status**: ⏳ pending CI

### c022 · island 3 · fitness unknown (merged via PR #226) · gen 21

- **Op**: exploration; **Cell**: parallel-typed-arrays · non-comparison; **Parent**: c003
- **Approach**: LSD 8-pass radix sort. All rx buffers module-level. Merged to main.
- **Status**: ✅ merged

### c003 · island 1 · fitness 27.999 · gen 2

- **Cell**: parallel-typed-arrays · comparison; NaN pre-partition + Float64Array; `fvals[a]!-fvals[b]!` comparator
- **Status**: ✅ accepted CI 24843983915; tsb=155.63ms / pandas=5.56ms

## 📚 Lessons Learned

- **All per-call TypedArray allocations eliminated** once module-level buffers are warm: zero GC pressure on the hot path after first call. Benchmark measures 50 iterations, so it's essentially free after warmup.
- `noUncheckedIndexedAccess`: TypedArray[i] = number|undefined; use `!`.
- Callback overhead bottleneck at n=100k: ~1.6M calls × 100ns = 160ms.
- LSD radix: 8-pass IEEE-754 transform eliminates callbacks. Even #swaps → result in curSrc after 8 passes.
- `arr[i]!++` invalid TS; use `const v=arr[i]!; arr[i]=v+1;`.
- **Branch must be fast-forwarded to origin/main** before committing to prevent phantom commits.
- Keys indexed by ROW (not by position/slot) simplifies the scatter step: `curB[cv] = r`.
- `new Uint32Array(fvals.buffer)` valid TypeScript; no `as` needed. Can be made module-level by storing as `_fvalsU32` and updating when `_fvals` grows.

## 🚧 Foreclosed Avenues

- Island 0 (boxed {v,i}): high GC at n=100k.
- BigInt64 packed sort: ~5-10x slower.

## 🔭 Future Directions

- After c023 lands: explore 4-pass 16-bit radix (half the passes, larger histogram = 64KB, cache effects unknown).
- Interleaved key layout: store [lo0, hi0, lo1, hi1, ...] for better spatial locality.
- Island 4 (hybrid): small-n fast path with Array.prototype.sort for n < 1000, radix for large n.

## 📊 Iteration History

### Iteration 23 — 2026-04-27 01:24 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24972180827)

- **Status**: ⏳ pending CI · **Op**: exploitation · **Island**: 3 · c023
- **Change**: Make finBuf/nanBuf/fvals/fvalsU32 module-level grow-on-demand (was per-call). Eliminates 1.6MB TypedArray GC per call (80MB for 50 bench iters). Branch ff'd to origin/main + 1 commit 1b603f1.
- **Metric**: pending CI (sandbox bun unavailable)

### Iteration 22 — 2026-04-26 07:22 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24951061682)

- **Status**: ⏳ pending CI (stale; c022 merged via PR #226; branch reset)
- **Change**: Same c023 attempt; lost to branch reset between runs.

### Iteration 21 — 2026-04-25 17:57 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24936876897)

- **Status**: ⏳ pending CI · c022 LSD radix with all rx module-level buffers. Now merged to main via PR #226.

### Iters 3–20 — 2026-04-23–25 — all phantom/pending-ci radix attempts (c017–c021) lost to branch resets or pending CI.

### Iters 1–2 — 2026-04-23 — ✅ c003 fitness=27.999 (tsb=155.63ms, pandas=5.56ms); iter 1 ❌ TS2538
