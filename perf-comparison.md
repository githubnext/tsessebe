# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-05-17T07:46:03Z |
| Iteration Count | 319 |
| Best Metric | 664 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | — |
| Issue | #221 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | error, error, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

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
- **bun in sandbox**: `bun` may not be available in the sandbox — TS validation is skipped locally; CI gate on GitHub Actions validates TS benchmarks.

## 🚧 Foreclosed Avenues

- Branch suffixes, sequential run_benchmarks.sh, SSH/HTTPS push.

---

## 🔭 Future Directions

- More string_accessor variants: startswith, endswith
- Option-variant benchmarks (axis/limit/method parameters)
- `datetime_tz` variants still uncovered
- `notna_boolean`, `add_sub_mul_div` (named series arithmetic) still uncovered

---

## 📊 Iteration History

### Iteration 319 — 2026-05-17T07:46:03Z — [Run](https://github.com/githubnext/tsb/actions/runs/25984977778)

- **Status**: ✅ Accepted
- **Change**: Added `pdArray`/`PandasArray` benchmark pair — 10k-element arrays of int, float, string, and nullable int types; tests creation, `.at()`, `.toArray()`, `.length`
- **Metric**: 664 (previous best: 663, delta: +1) · **Commit**: 2d75133
- **Notes**: `pdArray` and `PandasArray` (from `src/core/pd_array.ts`) had no benchmark coverage. Python equivalent uses `pd.array()` with nullable dtypes (`Int64`, `Float64`, `string`).

### Iteration 318 — 2026-05-16T13:24:01Z — [Run](https://github.com/githubnext/tsb/actions/runs/25963034091)

- **Status**: ✅ Accepted
- **Change**: Added `timedelta_range` and `combine` benchmark pairs (`timedelta_range` with 3 usage patterns, `combineSeries`/`combineDataFrame` on 10k-row data)
- **Metric**: 663 (previous best: 662, delta: +1) · **Commit**: 1ac9ac3
- **Notes**: Both functions were exported from `src/index.ts` but had no dedicated benchmarks. bun not in sandbox PATH; CI gate on GitHub Actions validates.

### Iteration 317 — 2026-05-15T19:26:27Z — [Run](https://github.com/githubnext/tsb/actions/runs/25936998176)

- **Status**: ✅ Accepted
- **Change**: Added `pipe` benchmark pair (`pipeSeries`/`dataFramePipe` on 100k-row Series+DataFrame); also fixed 2 pre-existing broken Python benchmarks (`bench_str_extract_all.py`, `bench_str_extract_groups.py` had escaped docstring quotes)
- **Metric**: 662 (previous best: 661, delta: +1) · **Commit**: f62eca8
- **Notes**: `pipe.ts` exports were unbenchmarked; Python equivalents use `Series.pipe` and `DataFrame.pipe`. bun not in sandbox PATH so TS validity check skipped locally; CI gate validates.

### Iteration 316 — 2026-05-14T19:31:43Z — [Run](https://github.com/githubnext/tsb/actions/runs/25880729267)

- **Status**: ✅ Accepted
- **Change**: Added `str_findall` benchmark pair: `strFindall` + `strFindFirst` + `strFindallCount` on 10k-element string Series
- **Metric**: 661 (previous best: 660, delta: +1) · **Commit**: 0dd114e
- **Notes**: `str_findall.ts` exports were uncovered; Python uses `str.findall`, `str.extract`, `str.count` as equivalents.

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
