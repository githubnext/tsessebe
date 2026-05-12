# Autoloop: tsb-perf-evolve

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-05-12T13:00:45Z |
| Iteration Count | 42 |
| Best Metric | 21.048 |
| Target Metric | — |
| Metric Direction | lower |
| Branch | autoloop/tsb-perf-evolve |
| PR | — |
| Issue | #189 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | pending-ci, pending-ci, pending-ci, pending-ci, accepted, pending-ci, pending-ci, rejected, pending-ci, pending-ci |

## 🧬 Population

### c042 · island 3 · fitness pending-ci · gen 42

- **Op**: exploitation; **Cell**: aos-typed-array · non-comparison; **Parent**: c041
- **Approach**: Module-level `_permBuf: number[]` + `_outBuf: number[]` grown lazily. Replace `new Array<number>(n)` + `new Array<T>(n)` per call with reused buffers (safe: Index/Series both copy via `Object.freeze([...data])`). Eliminates 2 × 800KB JS allocations per sort call.
- **Status**: ⏳ pending CI evaluation

### c041 · island 3 · fitness pending-ci · gen 41

- **Op**: exploitation; **Cell**: aos-typed-array · non-comparison; **Parent**: c029/c035
- **Approach**: Inverse IEEE-754 gather — replace `vals[origIdx]` random read with sequential `srcBuf[si+1]`/`srcBuf[si+2]` reads + ~6 arithmetic ops to reconstruct float via `_fvalsU32[0..1]`/`_fvals[0]` scratch. Avoids cold-cache random access into JS array.
- **Status**: ⏳ pending CI evaluation

### ~~c040~~ (evicted — never committed to branch; iteration 40 run produced no committed code)

- **Op**: exploitation; **Cell**: aos-typed-array · non-comparison; **Parent**: c029
- *(code never committed)*

### c038 · island 3 · fitness 11.721 (noise) · gen 38

- **Op**: exploitation; **Cell**: aos-typed-array · non-comparison; **Parent**: c035
- **Approach**: 4-pass hi-word 8-bit radix + O(n) insertion sort tie-break for equal-hi groups.
- **Status**: ❌ rejected — tsb 116-118ms unchanged vs c035's 112ms; pandas ran slow (10ms), inflating ratio.

### c029 · island 3 · fitness 21.048 · gen 29 — BEST

- **Approach**: AoS scatter; all 3 writes/element on same cache line. tsb=112.50ms / pandas=5.34ms.
- **Status**: ✅ accepted — baseline for all future iterations.

### Iters 1–37 (condensed)

- c022 ✅ merged PR #226 (LSD 8-pass radix, fitness ~29); c035 ✅ merged PR #272 (merged histograms, fitness 21.048); c036/c037 superseded; c028 fitness 21.841; c027 ❌; c003 island 1 fitness 27.999; c030–c034 lost.

## 📚 Lessons Learned

- LSD radix 8-pass (IEEE-754 transform) beats comparator sort; bottleneck is NOT scatter pass count.
- Module-level TypedArray buffers eliminate GC; grow lazily, never shrink.
- Even pass count → result in _rxA (no final copy). AoS beats SoA for scatter writes.
- Merged histogram init (all 8 passes inline) saves one O(n) scan. Stride counter (si+=3) avoids multiply.
- RangeIndex fast path saves 100k bounds-checked at() calls.
- **Scatter pass count is NOT the bottleneck**: halving 8→4 passes gave no tsb speedup (c037/c038).
- Benchmark noise: pandas varies 4–10ms; only tsb_mean_ms decrease confirms real improvement.

## 🚧 Foreclosed Avenues

- Island 0 (boxed {v,i}): high GC at n=100k.
- BigInt64 packed sort: ~5-10x slower.
- 4-pass hi-word radix + lo-word tie-break (c037, c038): tsb_mean_ms unchanged vs 8-pass (116-118ms vs 112ms). Scatter pass count is not the bottleneck; tie-break O(n) scan eats the savings.

## 🔭 Future Directions

- Profile what fraction of 112ms is: scatter writes vs gather vs JS/JIT overhead vs perm/outData allocation.
- Skip-pass: if a histogram bucket is 100% (all elements same byte), skip scatter without swap.
- Island 4 hybrid: native sort for n < 1k, radix for n ≥ 1k.
- If inverse-transform gather (c041) helps: also try pre-allocating perm as module-level number[] to save one allocation.

## 📊 Iteration History

### Iteration 42 — 2026-05-12 13:00 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25735886900)

- **Status**: ⏳ Pending CI · c042 · exploitation · island 3
- **Op**: exploitation; **Parent**: c041 (fitness pending, same island 3)
- **Change**: Add module-level `_permBuf` + `_outBuf` (grown lazily). Reuse instead of allocating `new Array<number>(n)` + `new Array<T>(n)` per call.
- **Metric**: pending CI evaluation (no bun in sandbox)
- **Hypothesis**: 55 calls × 2 × 800KB = ~88MB of per-call JS array allocations drive GC. Both Index and Series copy their inputs so buffer reuse is safe. Eliminating these allocations should reduce mean_ms.
- **Notes**: c041 was merged to main via PR #297. c042 builds on it by addressing the per-call allocation overhead identified in iter 38 notes.

### Iteration 41 — 2026-05-12 04:12 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25712799061)

- **Status**: ⏳ Pending CI · c041 · exploitation · island 3
- **Change**: Inverse IEEE-754 gather — replace `vals[origIdx]` random access with sequential srcBuf key reads + inverse-transform via `_fvalsU32[0..1]`/`_fvals[0]` scratch.
- **Metric**: pending CI evaluation (no bun in sandbox)
- **Notes**: c039/c040 were proposed in iterations 39/40 but never committed to branch (prior runs exited without committing). c041 is the same idea, properly committed.

### Iters 1–40 — c022 ✅ (fitness ~29), c035 ✅ (fitness 21.048, best), c038 ❌ (4-pass radix no help), c036/c037 ❌, c039/c040 never committed
