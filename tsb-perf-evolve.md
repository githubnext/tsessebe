# Autoloop: tsb-perf-evolve

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-28T12:54:00Z |
| Iteration Count | 25 |
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

### c025 · island 3 · fitness pending CI · gen 25

- **Op**: exploitation; **Cell**: parallel-typed-arrays · non-comparison; **Parent**: c022/main
- **Approach**: Make `_finBuf`, `_nanBuf`, `_fvals`, `_fvalsU32` module-level grow-on-demand. Eliminates ~1.6MB TypedArray GC per sort call. Commit e51416e.
- **Status**: ⏳ pending CI

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

## 🚧 Foreclosed Avenues

- Island 0 (boxed {v,i}): high GC at n=100k.
- BigInt64 packed sort: ~5-10x slower.

## 🔭 Future Directions

- 4-pass 16-bit radix (half passes, 64KB histogram, cache effects unknown).
- Interleaved key layout: [lo0, hi0, lo1, hi1, ...] for better spatial locality.
- Island 4 (hybrid): Array.prototype.sort for n < 1000, radix for n ≥ 1000.

## 📊 Iteration History

### Iteration 25 — 2026-04-28 12:54 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25053867836)

- **Status**: ⏳ pending CI · **Op**: exploitation · **Island**: 3 · c025
- **Change**: _finBuf/_nanBuf/_fvals/_fvalsU32 → module-level (was per-call). Commit e51416e.
- **Metric**: pending CI

### Iters 1–24 — 2026-04-23–28 — c003 ✅ fitness=27.999 (tsb=155.63ms, pandas=5.56ms). c022 ✅ merged PR #226 (LSD 8-pass radix). Others pending-ci or lost to branch resets.


## 🧬 Population

### c024 · island 3 · fitness pending CI · gen 24

- **Op**: exploitation (c022/main as parent); **Cell**: parallel-typed-arrays · non-comparison; **Parent**: c022
- **Approach**: Make `finBuf` (400KB), `nanBuf` (400KB), `fvals` (800KB), and `fvalsU32` (view) module-level grow-on-demand buffers. Eliminates 1.6MB TypedArray GC per sort call. Commit 4a642db.
- **Status**: ⏳ pending CI

### ~~c023~~ (evicted — lost to branch reset; superseded by c024)

### ~~c022~~ (merged via PR #226 — LSD 8-pass radix, all rx module-level)

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

### Iteration 24 — 2026-04-27 19:22 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25014795941)

- **Status**: ⏳ pending CI · **Op**: exploitation · **Island**: 3 · c024
- **Change**: Make finBuf/nanBuf/fvals/fvalsU32 module-level grow-on-demand (was per-call). Eliminates 1.6MB TypedArray GC per call (80MB for 50 bench iters). Branch ff'd to origin/main + commit 4a642db.
- **Metric**: pending CI (sandbox bun unavailable)

### Iters 3–23 — 2026-04-23–27 — multiple pending-ci radix attempts (c003–c023). c003 ✅ fitness=27.999 (tsb=155.63ms, pandas=5.56ms). c022 ✅ merged via PR #226 (LSD 8-pass radix, all rx buffers module-level). Others ⚠️ lost to branch resets.

### Iters 1–2 — 2026-04-23 — ✅ c003 fitness=27.999; iter 1 ❌ TS2538
