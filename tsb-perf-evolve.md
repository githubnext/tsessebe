# Autoloop: tsb-perf-evolve

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-24T19:51:00Z |
| Iteration Count | 8 |
| Best Metric | 27.999 |
| Target Metric | — |
| Branch | autoloop/tsb-perf-evolve |
| PR | pending CI |
| Issue | #189 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, not-pushed, not-pushed, pending, pending-ci, pending-ci, pending-ci |

## 🧬 Population

### c009 · island 3 · fitness pending CI · gen 8

- **Operator**: exploration; **Feature cell**: typed-array-view · non-comparison LSD radix
- **Parent**: c003 (island 1, fitness 27.999)
- **Approach**: LSD 8-pass radix sort on IEEE-754 bit-transformed float64 keys. View fvals.buffer as Uint32Array (fvU32[2*row]=lo, fvU32[2*row+1]=hi). Module-level _rxA/_rxB ping-pong + _rxKL/_rxKH keyed by row. Zero JS comparator callbacks. Reverse in-place for descending. String/mixed fallback unchanged.
- **Status**: pending CI — commit 5d3b5d1

### ~~c008,c007,c006,c005,c004~~ · (phantom: commits written but never pushed) · gens 3-7

### c003 · island 1 · fitness 27.999 · gen 2

- **Feature cell**: parallel-typed-arrays · comparison
- **Approach**: NaN pre-partition + Float64Array fvals; `fvals[a]!-fvals[b]!` comparator
- **Status**: ✅ accepted — CI run 24843983915; tsb=155.63ms / pandas=5.56ms

### ~~c002~~ · ❌ TS2538 · gen 1

## 📚 Lessons Learned

- `noUncheckedIndexedAccess`: TypedArray[i]=number|undefined; use `!`.
- c003 fitness=27.999: tsb=155.63ms vs pandas=5.56ms. ~1.6M JS callback calls in Uint32Array.sort(callback) at ~100ns/call ≈ 160ms. Callback overhead IS the bottleneck.
- `Uint32Array(_rfSlot.buffer)` gives two-element view of Float64Array bits — valid TypeScript, no `as` casts needed.
- Island 3 (LSD radix sort): 8-pass O(8n) counting sort on IEEE-754 transformed keys eliminates all JS comparator callbacks.
- After an even number of double-buffer swaps, the primary arrays hold the final sorted data.
- PR #206 was merged and branch was fast-forwarded; on next iteration, branch must be checked out from origin/main before committing new changes.
- `arr[i]!++` is INVALID in strict TypeScript (non-null assertion produces rvalue, not lvalue). Use `const v = arr[i]!; arr[i] = v + 1;` pattern instead.

## 🚧 Foreclosed Avenues

- Island 0 (boxed {v,i}): high GC at n=100k.
- BigInt64 packed sort: ~5-10x slower.
- Inline introsort (c005): never materialized; callback overhead likely still present with this approach.

## 🔭 Future Directions

- If radix sort (c009) succeeds: exploit — also make finBuf/nanBuf module-level to eliminate remaining per-call allocations.
- If radix sort fails: try Island 4 (hybrid: small-input Array.sort, large-input radix).

## 📊 Iteration History

### Iteration 8 — 2026-04-24 19:51 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24908806371)

- **Status**: ⏳ pending CI · **Op**: exploration · **Island**: 3 · **Candidate**: c009
- **Change**: LSD 8-pass radix sort; IEEE-754 transform via `new Uint32Array(fvals.buffer)`; module-level buffers; zero JS callbacks
- **Commit**: 5d3b5d1 · **Metric**: pending CI

### Iters 5–7 — 2026-04-24 (phantoms) — exploration island 3; commits written but never pushed

### Iters 1–4 — 2026-04-23
- Iter 2: ✅ c003 fitness=27.999 (tsb=155.63ms, pandas=5.56ms); PR #206 merged
- Iter 1: ❌ TS2538; human-fixed
