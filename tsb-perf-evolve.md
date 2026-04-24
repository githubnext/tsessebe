# Autoloop: tsb-perf-evolve

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-24T11:51:49Z |
| Iteration Count | 6 |
| Best Metric | 27.999 |
| Target Metric | — |
| Branch | autoloop/tsb-perf-evolve |
| PR | pending creation |
| Issue | #189 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, not-pushed, not-pushed, pending, pending-ci |

## 🧬 Population

### c007 · island 3 · fitness pending CI · gen 6

- **Operator**: exploration; **Feature cell**: parallel-typed-arrays · non-comparison
- **Parent**: c003 (island 1, fitness 27.999)
- **Approach**: LSD 8-pass counting sort on IEEE-754 bit-transformed float64 keys. Positive floats: flip sign bit; negative: flip all bits. Module-level double-buffered _rA/_rB + key arrays _rKLo/_rKHi (indexed by original row). Zero JS comparator callbacks. String/mixed fallback unchanged.
- **Status**: pending CI — commit 9456665

### ~~c006~~ · island 3 · fitness — (never pushed) · gen 5

### ~~c005~~ · island 1 · fitness — (never pushed) · gen 4

- **Approach**: Inline introsort — never committed. Callback overhead likely still present.

### ~~c004~~ · island 1 · never pushed · gen 3

- **Approach**: RangeIndex skip only — never committed.

### c003 · island 1 · fitness 27.999 · gen 2

- **Operator**: exploration; **Feature cell**: parallel-typed-arrays · comparison
- **Approach**: NaN pre-partition + Float64Array fvals; `fvals[a]!-fvals[b]!` numeric comparator; fvals indexed by row
- **Status**: ✅ accepted — CI run 24843983915; tsb=155.63ms / pandas=5.56ms

### ~~c002~~ · island 1 · fitness — (CI failed) · gen 1

- **Approach**: NaN partition + Uint32Array indirect sort + generic T[] comparator → ❌ TS2538.

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

- If radix sort (c007) succeeds: exploit with module-level finBuf/nanBuf/fvals to eliminate per-call allocation.
- If radix sort fails: try Island 4 (hybrid: small-input Array.sort, large-input radix).
- Island 2: packed-typed-array using Float32 for benchmark inputs.

## 📊 Iteration History

### Iteration 6 — 2026-04-24 11:51 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24887993206)

- **Status**: ⏳ pending CI · **Op**: exploration · **Island**: 3 (non-comparison) · **Candidate**: c007
- **Change**: LSD 8-pass counting sort on IEEE-754 bit-transformed float64 keys; zero JS comparator callbacks; module-level double-buffered Uint32Arrays (_rA/_rB) + key arrays (_rKLo/_rKHi indexed by original row)
- **Commit**: 9456665 · **Metric**: pending CI · **Delta**: expected ~20-30x vs c003 (27.999)
- **Notes**: c006 from iter 5 was never actually pushed (commit e7b8f49 phantom). This iteration re-implements the same plan from main. PR created as a draft.

### Iteration 5 — 2026-04-24 05:50 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24874449592)

- **Status**: 🔶 not pushed (phantom commit) · **Op**: exploration · **Island**: 3
- **Change**: LSD 8-pass radix sort attempt — commit e7b8f49 was recorded but never existed on remote
- **Commit**: — (not pushed) · **Metric**: — · **Delta**: —
- **Notes**: c006 was never committed to the remote branch; state was corrupted. Superseded by iter 6 (c007).

### Iters 1–4 — 2026-04-23

- Iter 4: 🔶 not pushed (c005 commit 4d03bb2 phantom; branch had fix commit 8d1d4a3 at fitness=27.999)
- Iter 3: 🔶 not pushed (c004 commit 19508f1 phantom)
- Iter 2: ✅ accepted — c003 fitness=27.999 (tsb=155.63ms, pandas=5.56ms); PR #206 merged
- Iter 1: ❌ CI failed TS2538; human-fixed → merged main
