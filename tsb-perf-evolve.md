# Autoloop: tsb-perf-evolve

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-24T17:51:00Z |
| Iteration Count | 7 |
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
| Recent Statuses | accepted, not-pushed, not-pushed, pending, pending-ci, pending-ci |

## 🧬 Population

### c008 · island 3 · fitness pending CI · gen 7

- **Operator**: exploration; **Feature cell**: parallel-typed-arrays · non-comparison
- **Parent**: c003 (island 1, fitness 27.999)
- **Approach**: LSD 8-pass counting sort on IEEE-754 bit-transformed float64 keys. Module-level _rA/_rB ping-pong + _rKLo/_rKHi keyed by original row index. Zero JS comparator callbacks. Reverse in-place for descending. String/mixed fallback unchanged.
- **Status**: pending CI — commit da443c7

### ~~c007~~ · (never pushed) · gen 6

### ~~c005~~ · (never pushed) · gen 4

### ~~c004~~ · (never pushed) · gen 3

### c003 · island 1 · fitness 27.999 · gen 2

- **Operator**: exploration; **Feature cell**: parallel-typed-arrays · comparison
- **Approach**: NaN pre-partition + Float64Array fvals; `fvals[a]!-fvals[b]!` numeric comparator; fvals indexed by row
- **Status**: ✅ accepted — CI run 24843983915; tsb=155.63ms / pandas=5.56ms

### ~~c002~~ · island 1 · gen 1

- **Approach**: NaN partition + Uint32Array indirect sort → ❌ TS2538.

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

- If radix sort (c008) succeeds: exploit with module-level finBuf/nanBuf/fvals to eliminate per-call allocation.
- If radix sort fails: try Island 4 (hybrid: small-input Array.sort, large-input radix).
- Island 2: packed-typed-array using Float32 for benchmark inputs.

## 📊 Iteration History

### Iteration 7 — 2026-04-24 17:51 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24903805265)

- **Status**: ⏳ pending CI · **Op**: exploration · **Island**: 3 (non-comparison) · **Candidate**: c008
- **Change**: LSD 8-pass counting sort on IEEE-754 bit-transformed float64 keys; zero JS comparator callbacks; module-level _rA/_rB/_rKLo/_rKHi; reverse-in-place for descending
- **Commit**: da443c7 · **Metric**: pending CI · **Delta**: expected ~20-30x vs c003 (27.999)
- **Notes**: c007 from iter 6 was another phantom commit (branch only had 8d1d4a3). Re-implemented from main with fixed TypeScript (no `!++` pattern; use read-then-assign for hist increments).

### Iteration 6 — 2026-04-24 11:51 UTC — phantom (c007 not pushed)

- **Status**: 🔶 not pushed · **Op**: exploration · **Island**: 3

### Iteration 5 — 2026-04-24 05:50 UTC — phantom (c006 not pushed)

- **Status**: 🔶 not pushed · **Op**: exploration · **Island**: 3

### Iters 1–4 — 2026-04-23

- Iter 4: 🔶 not pushed (c005 commit 4d03bb2 phantom; branch had fix commit 8d1d4a3 at fitness=27.999)
- Iter 3: 🔶 not pushed (c004 commit 19508f1 phantom)
- Iter 2: ✅ accepted — c003 fitness=27.999 (tsb=155.63ms, pandas=5.56ms); PR #206 merged
- Iter 1: ❌ CI failed TS2538; human-fixed → merged main
