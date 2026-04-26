# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-26T01:24:00Z |
| Iteration Count | 293 |
| Best Metric | 635 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | — |
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
**Metric**: benchmarked_functions (higher is better)
**Branch**: [`autoloop/perf-comparison`](../../tree/autoloop/perf-comparison)

---

## 🎯 Current Priorities

*(No specific priorities set — agent is exploring freely.)*

---

## 📚 Lessons Learned

- **Import paths**: `../../src/index.ts`. Series: `new Series({ data: [...] })`. DF: `DataFrame.fromColumns({...})`.
- **Standalones**: cummax/cummin/cumprod/cumsum/diff/explode/pct_change/seriesAbs/where/mask/sample/replace/astype/pivot.
- **groupby AggName**: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only.
- **merge_asof**: mergeAsof(left, right, { on: "key", direction: "backward"|"forward"|"nearest" }) — DFs must be sorted.
- **crossJoin**: crossJoin(left, right) — small DFs only (100×100 safe).
- **string_accessor**: available as `series.str.lower()`, `.strip()`, `.len()`, `.replace(pat, repl)`, `.split(sep)`.
- **insert_pop**: exported as `insertColumn(df, loc, col, values)` and `popColumn(df, col)`.
- **natsort**: exported as `natSorted(arr)` from src/index.ts.

## 🚧 Foreclosed Avenues

- **Suffixed branches**: Never commit to `autoloop/perf-comparison-{suffix}` branches. Only `autoloop/perf-comparison` counts.
- **Sequential run_benchmarks.sh**: Too slow for 500+ pairs. Use parallel Python runner.
- **SSH push** and **HTTPS push without credentials**: blocked. Use safeoutputs push_to_pull_request_branch.

---

## 🔭 Future Directions

- Continue adding option-variant benchmarks (axis/limit/method parameters)
- Check for new src/ modules added to tsb library
- More string_accessor variants: startswith, endswith, findall, extract

---

## 📊 Iteration History

### Iteration 293 — 2026-04-26T01:24:00Z — [Run](https://github.com/githubnext/tsessebe/actions/runs/24945163144)

- **Status**: ✅ Accepted
- **Change**: Added `bench_combine_series.ts` and `bench_combine_series.py` — benchmarks `combineSeries` (element-wise binary fn over two Series) vs pandas `Series.combine`.
- **Metric**: 635 (previous best: 634, delta: +1)
- **Commit**: 36a40be
- **Notes**: Main branch had 634 pairs after previous merges; adding this pair restores progress. `combineSeries` is a distinct function from `combineFirstSeries` and had no benchmark yet.

### Iters 289–292 — ✅ | Metrics 638→653 (+5 each). New pairs: xs_dataframe/series, at_iat, series_apply_fn, merge_asof/ordered, crossjoin, resample, styler, swap_level, auto_corr, string_accessor, insert_pop, natsort, truncate, update, filter_labels, window_extended, squeeze_ops, corr_with, add_prefix_suffix, infer_convert_dtypes, dot_matmul.

### Iters 1–288 — ✅/⚠️ | Metrics 0→653. See git history for details.
