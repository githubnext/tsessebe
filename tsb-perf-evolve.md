# Autoloop: tsb-perf-evolve

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-23T17:33:48Z |
| Iteration Count | 3 |
| Best Metric | — (pending CI) |
| Target Metric | — |
| Branch | autoloop/tsb-perf-evolve |
| PR | #206 |
| Issue | #189 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | rejected, pending, pending |

## 🧬 Population

### c004 · island 1 · fitness — (pending) · gen 3

- **Operator**: exploitation (parent: c003); **Feature cell**: parallel-typed-arrays · comparison
- **Approach**: c003 + skip `Index.take(perm)` for default RangeIndex; directly construct `new Index<Label>(perm)` saving ~200k ops/call
- **Status**: pending CI (commit 19508f1)

### c003 · island 1 · fitness — (pending) · gen 2

- **Operator**: exploration; **Feature cell**: parallel-typed-arrays · comparison
- **Approach**: NaN pre-partition + parallel Float64Array; `fvals[a]!-fvals[b]!` numeric comparator; string fallback; fvals indexed by row (fixed from original b07ee72 which used position-based index)
- **Status**: pending CI (commits b07ee72 + 8d1d4a3 fix)

### ~~c002~~ · island 1 · fitness — (CI failed) · gen 1

- **Approach**: NaN pre-partition + Uint32Array indirect sort + generic T[] comparator
- **Status**: ❌ TS2538; human-fixed + merged to main (PR #190, b230a01)

## 📚 Lessons Learned

- `noUncheckedIndexedAccess`: TypedArray[i]=number|undefined; use `!` or `??`.
- TS2538 = bracket-index used as index without `!`. `as` casts pass TS fine.
- Island 1 baseline on main (5792af4). Benchmark: Series<number|null> dtype=float64.
- c003 had bug: `fvals[finCount]` (position-based) instead of `fvals[i]` (row-based) — caused wrong comparisons → NaN test failures. Fixed in 8d1d4a3.

## 🚧 Foreclosed Avenues

- Island 0 (boxed {v,i}): high GC at n=100k.
- BigInt64 packed sort: ~5-10x slower.

## 🔭 Future Directions

- Island 3 (radix sort): float64→uint, O(n).
- Island 4 (hybrid): small-n boxed + large-n typed.

## 📊 Iteration History

### Iter 3 — 2026-04-23 17:33 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24849430735)

- **Status**: pending · **Op**: exploitation (c003) · **Island**: 1
- **Change**: Skip `Index.take(perm)` for default RangeIndex; `new Index<Label>(perm)` directly
- **Commit**: 19508f1
- **Notes**: Saves ~200k ops/call (100k at() + 100k push eliminated). CI will determine fitness.

### Iter 2 — 2026-04-23 10:33 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24830395075)

- **Status**: pending (CI blocked; action_required 0 jobs on 8d1d4a3 fix) · **Op**: exploration · **Island**: 1
- **Change**: Parallel Float64Array + `fvals[a]!-fvals[b]!` monomorphic comparator (fix: store fvals by row index)
- **Commit**: b07ee72 → 8d1d4a3 (fix)

### Iter 1 — 2026-04-23 03:52 UTC

- **Status**: ❌ CI failed · **Island**: 1
- **Change**: NaN pre-partition + Uint32Array indirect sort (generic comparator)
- **Commit**: 24bbe85 → fixed b230a01 → merged main
