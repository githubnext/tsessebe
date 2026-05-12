# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-05-12T06:36:28Z |
| Iteration Count | 312 |
| Best Metric | 655 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | — |
| Issue | #221 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, error, accepted, error, error, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Benchmark every tsb function vs pandas equivalent, one per iteration.
**Metric**: benchmarked_functions (higher is better) · **Issue**: #221 · **PR**: (new, #265 merged)

---

## 🎯 Current Priorities

*(No specific priorities set — agent is exploring freely.)*

---

## 📚 Lessons Learned

- **Import paths**: Always `../../src/index.js` (not `.ts`) for all benchmark files.
- **groupby AggName**: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only.
- **merge_asof**: `mergeAsof(left, right, { on, direction })` — DFs must be sorted.
- **corrWith**: `corrWith(df, seriesOther)` — DF as first arg, returns Series per column.

## 🚧 Foreclosed Avenues

- Branch suffixes, sequential run_benchmarks.sh, SSH/HTTPS push.

---

## 🔭 Future Directions

- More string_accessor variants: startswith, endswith
- Option-variant benchmarks (axis/limit/method parameters)
- `format_ops`, `hash_biject_array`, `timedelta_range`, `cat_accessor`, `datetime_tz`

---

## 📊 Iteration History

### Iteration 312 — 2026-05-12T06:36:28Z — [Run](https://github.com/githubnext/tsessebe/actions/runs/25717773514)

- **Status**: ✅ Accepted
- **Change**: Added 2 benchmark pairs: `hash_array` (FNV-1a hashing of mixed scalar arrays) and `swaplevel` (swapLevelSeries + reorderLevelsSeries on 3-level MultiIndex)
- **Metric**: 655 (previous best: 655, delta: +2 over current main baseline of 653) · **Commit**: 5dd1faf
- **Notes**: hash_array and swaplevel were the last two stats modules with zero coverage; all imports use `../../src/index.js` extension.

### Iteration 311 — 2026-05-11T23:15:05Z — [Run](https://github.com/githubnext/tsessebe/actions/runs/25702866515)

- **Status**: ✅ Accepted
- **Change**: Added 2 benchmark pairs: `apply` (Series.apply/DataFrame.applymap/DataFrame.apply axis=0) and `rename_ops` (renameSeriesIndex, renameDataFrame, addPrefix/addSuffix, setAxis)
- **Metric**: 655 (previous best: 653 real baseline, state stale at 657; delta: +2) · **Commit**: f260ab1
- **Notes**: Filled apply and rename_ops — key functional modules for element-wise function application and label renaming.

### Iteration 310 — 2026-05-11T07:32:46Z — [Run](https://github.com/githubnext/tsessebe/actions/runs/25656549920)

- **Status**: ✅ Accepted
- **Change**: Added 4 benchmark pairs: `math_ops`, `na_ops`, `reduce_ops`, `numeric_ops`
- **Metric**: 657 (delta: +4) · **Commit**: 3ed4674

### Iters 1–309 — ✅/⚠️ | Metrics 0→653. See git history on autoloop/perf-comparison branch.
