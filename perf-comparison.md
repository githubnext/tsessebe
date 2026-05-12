# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-05-12T18:51:56Z |
| Iteration Count | 313 |
| Best Metric | 657 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | #300 |
| Issue | #221 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | error, accepted, error, error, accepted, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Benchmark every tsb function vs pandas equivalent, one per iteration.
**Metric**: benchmarked_functions (higher is better) · **Issue**: #221 · **PR**: #300

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
- `timedelta_range`, `datetime_tz` (still uncovered)

---

## 📊 Iteration History

### Iteration 313 — 2026-05-12T18:51:56Z — [Run](https://github.com/githubnext/tsessebe/actions/runs/25755262251)

- **Status**: ✅ Accepted
- **Change**: Added 2 benchmark pairs: `cat_accessor` (CategoricalAccessor.categories/codes/addCategories/removeUnusedCategories on 50k-row Series) and `hash_biject_array` (hashBijectArray + hashBijectInverse on mixed string/int array)
- **Metric**: 657 (previous best: 655, delta: +2) · **Commit**: 5ae546a
- **Notes**: cat_accessor and hash_biject_array were both listed in Future Directions with zero benchmark coverage; Python equivalents simulate the same bijection logic.

### Iteration 312 — 2026-05-12T06:36:28Z — [Run](https://github.com/githubnext/tsessebe/actions/runs/25717773514)

- **Status**: ✅ Accepted
- **Change**: Added hash_array and swaplevel benchmark pairs
- **Metric**: 655 (delta: +2) · **Commit**: 5dd1faf

### Iteration 311 — 2026-05-11T23:15:05Z — [Run](https://github.com/githubnext/tsessebe/actions/runs/25702866515)

- **Status**: ✅ Accepted
- **Change**: Added apply and rename_ops benchmark pairs
- **Metric**: 655 (delta: +2) · **Commit**: f260ab1

### Iters 310–312 — ✅ | Metrics 653→655: Added math_ops, na_ops, reduce_ops, numeric_ops, apply, rename_ops, hash_array, swaplevel (8 pairs).
