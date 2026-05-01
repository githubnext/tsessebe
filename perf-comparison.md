# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-05-01T18:38:13Z |
| Iteration Count | 301 |
| Best Metric | 640 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | — |
| Issue | #221 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, error, accepted, accepted, error, accepted, error, error, accepted, accepted |

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

### Iteration 301 — 2026-05-01T18:38:13Z — [Run](https://github.com/githubnext/tsessebe/actions/runs/25227439051)

- **Status**: ✅ Accepted
- **Change**: Added 3 benchmark pairs: `xs` (xsDataFrame row cross-section), `update` (seriesUpdate NaN-aware overwrite), `compare` (seriesEq/seriesLt/seriesGe scalar comparisons).
- **Metric**: 640 (previous best: 637, delta: +3) · **Commit**: ec8f186

### Iters 295–300 — ✅/⚠️ | Metrics 634→637: truncate, filter_labels, assign, transform_agg, corrwith, autocorr, pipe_apply, to_from_dict added; one error run (bun unavailable).

### Iters 1–295 — ✅/⚠️ | Metrics 0→633. See git history on autoloop/perf-comparison branch.
