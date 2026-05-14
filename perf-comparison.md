# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-05-14T05:59:24Z |
| Iteration Count | 315 |
| Best Metric | 660 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | (new PR pending — #300 was merged) |
| Issue | #221 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, error, error, accepted, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Benchmark every tsb function vs pandas equivalent, one per iteration.
**Metric**: benchmarked_functions (higher is better) · **Issue**: #221 · **PR**: (new PR pending)

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

### Iteration 315 — 2026-05-14T05:59:24Z — [Run](https://github.com/githubnext/tsessebe/actions/runs/25844508188)

- **Status**: ✅ Accepted
- **Change**: Added `to_markdown` benchmark pair: `toMarkdown` + `toLaTeX` on a 1000-row DataFrame (3 columns: float, string, int)
- **Metric**: 660 (previous best: 659, delta: +1) · **Commit**: 76f3e1e
- **Notes**: `toMarkdown`/`toLaTeX` (from `stats/format_table.ts`) had no benchmark coverage; Python equivalents use `df.to_markdown()` and `df.to_latex()`. New PR created since #300 was merged.

### Iteration 314 — 2026-05-13T13:02:48Z — [Run](https://github.com/githubnext/tsessebe/actions/runs/25800686638)

- **Status**: ✅ Accepted
- **Change**: Added `indexers` and `scalar_extract` benchmark pairs
- **Metric**: 659 (delta: +2) · **Commit**: 6ed3c7b

### Iteration 313 — 2026-05-12T18:51:56Z — [Run](https://github.com/githubnext/tsessebe/actions/runs/25755262251)

- **Status**: ✅ Accepted
- **Change**: Added `cat_accessor` and `hash_biject_array` benchmark pairs
- **Metric**: 657 (delta: +2) · **Commit**: 5ae546a

### Iters 1–313 — ✅ | Metrics 0→657: Built out full benchmark suite across all tsb modules (Series, DataFrame, GroupBy, merge, reshape, window, stats, io, string/datetime accessors, categorical, etc.).
