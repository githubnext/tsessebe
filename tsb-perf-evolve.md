# Autoloop: tsb-perf-evolve

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-24T05:50:07Z |
| Iteration Count | 5 |
| Best Metric | 27.999 |
| Target Metric | — |
| Branch | autoloop/tsb-perf-evolve |
| PR | pending (new PR queued) |
| Issue | #189 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | rejected, accepted, not-pushed, not-pushed, pending |

## 🧬 Population

### c006 · island 3 · fitness pending · gen 5

- **Operator**: exploration; **Feature cell**: parallel-typed-arrays · non-comparison
- **Approach**: 8-pass LSD counting sort on IEEE-754 bit-transform of float64 values. Zero JS callbacks. Positive floats: flip bit 63; negative floats: flip all 64 bits. Double-buffered scratch Uint32Arrays (module-level, lazy-grown).
- **Status**: pending CI — commit e7b8f49 · PR creation queued

### ~~c005~~ · island 1 · fitness — (never pushed) · gen 4

- **Operator**: exploitation (c003); **Feature cell**: parallel-typed-arrays · comparison
- **Approach**: Inline introsort replacing Uint32Array.sort(callback) — never actually committed to remote branch. Commit 4d03bb2 recorded in state but doesn't exist.
- **Status**: ❌ not pushed (branch had fix commit 8d1d4a3 by copilot-swe-agent; PR #206 merged with c003 code at fitness=27.999)

### ~~c004~~ · island 1 · never pushed · gen 3

- **Approach**: RangeIndex skip only — commit 19508f1 recorded but never pushed.
- **Status**: ❌ not pushed

### c003 · island 1 · fitness 27.999 · gen 2

- **Operator**: exploration; **Feature cell**: parallel-typed-arrays · comparison
- **Approach**: NaN pre-partition + Float64Array fvals; `fvals[a]!-fvals[b]!` numeric comparator; fvals indexed by row
- **Status**: ✅ accepted — CI run 24843983915; tsb=155.63ms / pandas=5.56ms

### ~~c002~~ · island 1 · fitness — (CI failed) · gen 1

- **Approach**: NaN pre-partition + Uint32Array indirect sort + generic T[] comparator
- **Status**: ❌ TS2538; human-fixed + merged main (b230a01)

## 📚 Lessons Learned

- `noUncheckedIndexedAccess`: TypedArray[i]=number|undefined; use `!`.
- c003 fitness=27.999: tsb=155.63ms vs pandas=5.56ms. ~1.6M JS callback calls in Uint32Array.sort(callback) at ~100ns/call ≈ 160ms. Callback overhead IS the bottleneck.
- `Uint32Array(_rfSlot.buffer)` gives two-element view of Float64Array bits — valid TypeScript, no `as` casts needed.
- Island 3 (LSD radix sort): 8-pass O(8n) counting sort on IEEE-754 transformed keys eliminates all JS comparator callbacks.
- After an even number of double-buffer swaps, the primary arrays hold the final sorted data.
- PR #206 was merged and branch was fast-forwarded; on next iteration, branch must be checked out from origin/main before committing new changes.

## 🚧 Foreclosed Avenues

- Island 0 (boxed {v,i}): high GC at n=100k.
- BigInt64 packed sort: ~5-10x slower.
- Inline introsort (c005): never materialized; callback overhead likely still present with this approach.

## 🔭 Future Directions

- If radix sort (c006) succeeds: exploit with buffer reuse for finBuf/nanBuf/fvals (module-level).
- If radix sort fails: try Island 4 (hybrid: small-input Array.sort, large-input radix).
- Explore Island 2 (packed-typed-array using Float32 approximation for benchmark inputs).

## 📊 Iteration History

### Iteration 5 — 2026-04-24 05:50 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24874449592)

- **Status**: pending CI · **Op**: exploration · **Island**: 3 (non-comparison)
- **Change**: LSD 8-pass radix sort on IEEE-754 bit-transformed float64 keys; zero JS callbacks
- **Commit**: e7b8f49 · **Metric**: pending · **Delta**: TBD (expected ~20-30x improvement)
- **Notes**: Eliminates the ~1.6M comparator callbacks that dominate the 155ms/call baseline.

### Iters 1–4 — 2026-04-23

- Iter 4: 🔶 not pushed (c005 commit 4d03bb2 phantom; branch had fix commit 8d1d4a3 at fitness=27.999)
- Iter 3: 🔶 not pushed (c004 commit 19508f1 phantom)
- Iter 2: ✅ accepted — c003 fitness=27.999 (tsb=155.63ms, pandas=5.56ms); PR #206 merged
- Iter 1: ❌ CI failed TS2538; human-fixed → merged main
