# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-05-03T07:05:54Z |
| Iteration Count | 303 |
| Best Metric | 646 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | — |
| Issue | #221 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, error, accepted, error, error, accepted, accepted, accepted, accepted |

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

### Iteration 303 — 2026-05-03T07:05:54Z — [Run](https://github.com/githubnext/tsessebe/actions/runs/25272621402)

- **Status**: ✅ Accepted
- **Change**: Added 3 benchmark pairs: `keep_true_false` (keepTrue/keepFalse boolean mask filtering), `merge_ordered` (mergeOrdered sorted merge), `styler` (dataFrameStyle highlight+gradient).
- **Metric**: 646 (previous best: 643, delta: +3) · **Commit**: 0f8f4a2

### Iteration 302 — 2026-05-02T12:39:05Z — [Run](https://github.com/githubnext/tsessebe/actions/runs/25251927678)

- **Status**: ✅ Accepted
- **Change**: Added 3 benchmark pairs: `squeeze` (squeezeSeries/squeezeDataFrame), `hash_pandas_object` (hashPandasObject Series+DF), `infer_objects` (inferObjectsSeries/inferObjectsDataFrame).
- **Metric**: 643 (previous best: 640, delta: +3) · **Commit**: 6ec27bb

### Iteration 301 — 2026-05-01T18:38:13Z — [Run](https://github.com/githubnext/tsessebe/actions/runs/25227439051)

- **Status**: ✅ Accepted
- **Change**: Added 3 benchmark pairs: `xs` (xsDataFrame row cross-section), `update` (seriesUpdate NaN-aware overwrite), `compare` (seriesEq/seriesLt/seriesGe scalar comparisons).
- **Metric**: 640 (previous best: 637, delta: +3) · **Commit**: ec8f186

### Iters 1–294 — ✅/⚠️ | Metrics 0→633. See git history on autoloop/perf-comparison branch.
