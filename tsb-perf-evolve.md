# Autoloop: tsb-perf-evolve

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-05-11T02:37:10Z |
| Iteration Count | 39 |
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
| Recent Statuses | pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, accepted, pending-ci, pending-ci, rejected, pending-ci |

## 🧬 Population

### c039 · island 3 · fitness pending-ci · gen 39

- **Op**: exploitation; **Cell**: aos-typed-array · non-comparison; **Parent**: c029
- **Approach**: Module-level perm buffer reuse (save 1 alloc/call) + invMap (Uint32Array) for typed-array gather from `_fvals` instead of HOLEY `vals[]`.
- **Status**: ⏳ pending CI evaluation

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
- **c039 in progress**: perm reuse + invMap typed-array gather — CI pending.
- Skip-pass: if a histogram bucket is 100% (all elements same byte), skip scatter without swap.
- Island 4 hybrid: native sort for n < 1k, radix for n ≥ 1k.
- If invMap+fvals doesn't help: try outData as pre-allocated Float64Array (returned as backing store for Series).

## 📊 Iteration History

### Iteration 39 — 2026-05-11 02:37 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25647336180)

- **Status**: ⏳ Pending CI · c039 · exploitation · island 3
- **Change**: Perm reuse (module-level `_permBuf`) + invMap typed-array gather (`_fvals[_invMap[idx]]`).
- **Metric**: pending CI evaluation (sandbox has no bun runtime)

### Iteration 38 — 2026-05-10 13:22 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25629811599)

- **Status**: ❌ Rejected · c038 · exploitation · island 3
- **Change**: 4-pass hi-word radix + tie-break (halve scatter passes). tsb=116ms, pandas=10ms(noise).
- **Metric**: 11.721 (best: 21.048) — improvement was pandas variability, not tsb speedup.

### Iters 1–37 — c022 ✅ (fitness ~29), c035 ✅ (fitness 21.048), c037/c036 superseded, c038 ❌### Iteration 36 — 2026-05-09 01:26 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25587692274)

- **Status**: superseded (branch reset to main); c036 — unroll 8 scatter passes

### Iters 29–35 — ✅ accepted (fitness 21.048); c035 merged PR #272

### Iters 1–28 — c022 ✅ merged PR #226 (LSD 8-pass radix, fitness ~29→21.048)
