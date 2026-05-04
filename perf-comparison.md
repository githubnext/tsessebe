# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-05-04T01:09:41Z |
| Iteration Count | 304 |
| Best Metric | 649 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | — |
| Issue | #221 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, error, accepted, error, error, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Benchmark every tsb function vs pandas equivalent, one per iteration.
**Metric**: benchmarked_functions (higher is better) · **Issue**: #221 · **PR**: #265

---

## 🎯 Current Priorities

*(No specific priorities set — agent is exploring freely.)*

---

## 📚 Lessons Learned

- **Import paths**: `../../src/index.ts`. Series: `new Series({ data: [...] })`. DF: `DataFrame.fromColumns({...})`.
- **groupby AggName**: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only.
- **merge_asof**: mergeAsof(left, right, { on: "key", direction: "backward"|"forward"|"nearest" }) — DFs must be sorted.
- **crossJoin**: crossJoin(left, right) — small DFs only (100×100 safe).
- **string_accessor**: `series.str.lower()`, `.strip()`, `.len()`, `.replace(pat, repl)`, `.split(sep)`.
- **insert_pop**: `insertColumn(df, loc, col, values)` / `popColumn(df, col)`. **natsort**: `natSorted(arr)`.
- **Styler**: `dataFrameStyle(df).highlightMax().highlightMin().backgroundGradient().exportStyles()`.
- **mergeOrdered**: `mergeOrdered(df1, df2, { on: "key" })`. **keepTrue/keepFalse**: boolean mask on Series.

- **corrWith**: takes a DataFrame as first arg (not two Series); `corrWith(df, seriesOther)` returns a Series of correlation coefficients per column.
- **dot_matmul**: `dataFrameDotDataFrame(left, right)` requires left.columns to match right.index row labels for the inner join.

## 🚧 Foreclosed Avenues

- **Suffixed branches**: Only `autoloop/perf-comparison` (never with suffix).
- **Sequential run_benchmarks.sh**: Too slow for 500+ pairs.
- **SSH/HTTPS push**: Use safeoutputs push_to_pull_request_branch.

---

## 🔭 Future Directions

- More string_accessor variants: startswith, endswith, findall, extract
- Option-variant benchmarks (axis/limit/method parameters)

---

## 📊 Iteration History

### Iteration 304 — 2026-05-04T01:09:41Z — [Run](https://github.com/githubnext/tsessebe/actions/runs/25296135822)

- **Status**: ✅ Accepted
- **Change**: Added 3 benchmark pairs: `corrwith` (autoCorr lag-1 + corrWith DataFrame vs Series), `dot_matmul` (seriesDotSeries + dataFrameDotDataFrame), `eval_query` (queryDataFrame + evalDataFrame on 100k-row DF).
- **Metric**: 649 (previous best: 646, delta: +3) · **Commit**: 259c75b

### Iters 302–303 — ✅ | Metrics 640→643→646: squeeze/hash_pandas_object/infer_objects, keep_true_false/merge_ordered/styler.

### Iters 1–301 — ✅/⚠️ | Metrics 0→640. See git history on autoloop/perf-comparison branch.
