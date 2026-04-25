# Autoloop: tsb-perf-evolve

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-25T03:47:36Z |
| Iteration Count | 12 |
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
| Recent Statuses | pending-ci, not-pushed, not-pushed, pending, pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, pending-ci |

## 🧬 Population

### c013 · island 3 · fitness pending CI · gen 12

- **Operator**: exploration; **Feature cell**: parallel-typed-arrays · non-comparison
- **Parent**: c003 (island 1, fitness 27.999)
- **Approach**: LSD 8-pass radix sort on IEEE-754 bit-transformed float64 keys. Module-level _rxA_idx/_rxB_idx/_rxA_lo/_rxB_lo/_rxA_hi/_rxB_hi ping-pong buffers; _rxCnt 256-bucket histogram. `new Uint32Array(fvals.buffer)` for raw bits. Zero JS comparator callbacks. Descending by reverse copy. String/mixed fallback unchanged. Commit 1affdf2.
- **Status**: ⏳ pending CI — commit 1affdf2

### ~~c012~~ · phantom · gen 11 — same radix design; commit 2c2d728 never reached remote (computed patch was 2.6 MB due to stale remote branch ref; rebased on old tip to fix)

### c011 · island 3 · ~~phantom~~ · gen 10 — same radix design, never pushed (d25a8b5 lost on fast-forward)

### ~~c010~~ · phantom · gen 9 — same radix design; commit b2c8640 was on a pre-merge branch, never landed in main

### ~~c008,c007,c006,c005,c004~~ · (phantom: commits written but never pushed) · gens 3-7

### c003 · island 1 · fitness 27.999 · gen 2

- **Feature cell**: parallel-typed-arrays · comparison
- **Approach**: NaN pre-partition + Float64Array fvals; `fvals[a]!-fvals[b]!` comparator
- **Status**: ✅ accepted — CI run 24843983915; tsb=155.63ms / pandas=5.56ms

### ~~c002~~ · ❌ TS2538 · gen 1

## 📚 Lessons Learned

- `noUncheckedIndexedAccess`: TypedArray[i]=number|undefined; use `!`.
- Callback overhead is bottleneck at n=100k: ~1.6M calls × 100ns = 160ms.
- `new Uint32Array(fvals.buffer)` is valid TypeScript; no `as` needed.
- Island 3 (LSD radix sort): 8-pass on IEEE-754 transformed keys eliminates callbacks.
- After even number of ping-pong swaps, src arrays hold final result.
- `arr[i]!++` invalid in strict TS; use `const v=arr[i]!; arr[i]=v+1;`.
- **Patch size fix**: When remote branch is stale, safeoutputs diff is large. Fix: base commit on origin/autoloop/tsb-perf-evolve directly (not origin/main) so patch = only sortValues change.

## 🚧 Foreclosed Avenues

- Island 0 (boxed {v,i}): high GC at n=100k.
- BigInt64 packed sort: ~5-10x slower.
- Inline introsort (c005): never materialized; callback overhead likely still present with this approach.

## 🔭 Future Directions

- If radix sort (c010) succeeds: exploit — also make finBuf/nanBuf module-level to eliminate remaining per-call allocations.
- If radix sort fails: try Island 4 (hybrid: small-input Array.sort, large-input radix).

## 📊 Iteration History

### Iteration 12 — 2026-04-25 03:47 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24921830984)

- **Status**: ⏳ pending CI · **Op**: exploration · **Island**: 3 · **Candidate**: c013
- **Change**: LSD 8-pass radix sort on IEEE-754 transformed float64 keys; module-level ping-pong buffers; zero comparator callbacks; rebased on old remote tip to keep PR patch small
- **Commit**: 1affdf2 · **Metric**: pending CI
- **Notes**: Previous c012 was phantom due to 2.6 MB patch (remote branch stale vs main); fixed by basing commit on origin/autoloop/tsb-perf-evolve directly.

### Iteration 11 — 2026-04-25 00:51 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24918488164)

- **Status**: ❌ phantom (c012 commit 2c2d728 never reached remote; patch size 2.6 MB exceeded limit)
- **Notes**: Patch was large because remote branch was 33 commits behind main; fix: rebase on old remote tip.

### Iters 5–10 — 2026-04-24 — ❌ phantoms — exploration island 3; LSD radix sort attempts, commits never pushed

### Iters 1–4 — 2026-04-23
- Iter 2: ✅ c003 fitness=27.999 (tsb=155.63ms, pandas=5.56ms); PR #206 merged
- Iter 1: ❌ TS2538; human-fixed
