# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-05-11T23:15:05Z |
| Iteration Count | 311 |
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
| Recent Statuses | accepted, accepted, error, accepted, error, error, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Benchmark every tsb function vs pandas equivalent, one per iteration.
**Metric**: benchmarked_functions (higher is better) · **Issue**: #221 · **PR**: (new, #265 merged)

---

## 🎯 Current Priorities

*(No specific priorities set — agent is exploring freely.)*

---

## 📚 Lessons Learned

- **Import paths**: `../../src/index.ts` for Series/DataFrame; direct stats module for specific functions (e.g. `../../src/stats/math_ops.ts`).
- **groupby AggName**: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only.
- **merge_asof**: `mergeAsof(left, right, { on, direction })` — DFs must be sorted.
- **string_accessor**: `series.str.lower()`, `.strip()`, `.len()`, `.replace(pat, repl)`, `.split(sep)`.
- **corrWith**: `corrWith(df, seriesOther)` — DF as first arg, returns Series per column.

## 🚧 Foreclosed Avenues

- **Suffixed branches**: Only `autoloop/perf-comparison` (never with suffix).
- **Sequential run_benchmarks.sh**: Too slow for 500+ pairs.
- **SSH/HTTPS push**: Use safeoutputs push_to_pull_request_branch.

---

## 🔭 Future Directions

- More string_accessor variants: startswith, endswith
- Option-variant benchmarks (axis/limit/method parameters)
- `format_ops`, `swaplevel`

---

## 📊 Iteration History

### Iteration 311 — 2026-05-11T23:15:05Z — [Run](https://github.com/githubnext/tsessebe/actions/runs/25702866515)

- **Status**: ✅ Accepted
- **Change**: Added 2 benchmark pairs: `apply` (Series.apply/DataFrame.applymap/DataFrame.apply axis=0) and `rename_ops` (renameSeriesIndex, renameDataFrame, addPrefix/addSuffix, setAxis)
- **Metric**: 655 (previous best: 653 real baseline, state stale at 657; delta: +2) · **Commit**: f260ab1
- **Notes**: Filled apply and rename_ops — key functional modules for element-wise function application and label renaming.

### Iteration 310 — 2026-05-11T07:32:46Z — [Run](https://github.com/githubnext/tsessebe/actions/runs/25656549920)

- **Status**: ✅ Accepted
- **Change**: Added 4 benchmark pairs: `math_ops` (absSeries/roundSeries), `na_ops` (ffillSeries/bfillSeries), `reduce_ops` (nuniqueSeries/anySeries/allSeries), `numeric_ops` (seriesFloor/seriesCeil/seriesSqrt)
- **Metric**: 657 (delta: +4) · **Commit**: 3ed4674

### Iters 306–309 — ✅ | Metrics 651→657: replace/cum_ops, str_findall/combine, window_extended/str_findall/scalar_extract, add_sub_mul_div/at_iat/elem_ops/pow_mod.

### Iters 1–305 — ✅/⚠️ | Metrics 0→651. See git history on autoloop/perf-comparison branch.
