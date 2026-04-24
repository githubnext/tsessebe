# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-24T19:25:00Z |
| Iteration Count | 289 |
| Best Metric | 638 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | — (pending CI) |
| Issue | #aw_pcissue |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, error, error, accepted, accepted, error, error, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

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
## 🚧 Foreclosed Avenues

- **Suffixed branches**: Never commit to `autoloop/perf-comparison-{suffix}` branches. Only `autoloop/perf-comparison` counts.
- **Sequential run_benchmarks.sh**: Too slow for 500+ pairs. Use parallel Python runner.
- **SSH push** and **HTTPS push without credentials**: blocked. Use safeoutputs push_to_pull_request_branch.

---

## 🔭 Future Directions

- Continue adding option-variant benchmarks (axis/limit/method parameters)
- Check for new src/ modules added to tsb library

---

## 📊 Iteration History

### Iteration 289 — 2026-04-24T19:25 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24907776457)

- **Status**: ✅ Accepted (pending CI) · **Metric**: 638 (baseline 633, +5 from main) · 5 new pairs: xs_dataframe, xs_series, at_iat_dataframe, at_iat_series, series_apply_fn

### Iter 287–288 — ✅ | +5 pairs each (fast-forward from main 633 → 638). New: merge_asof, merge_ordered, join, crossjoin, resample_agg, styler, swap_level, keep_true_false, auto_corr, assert_equal.

### Iters 277–286 — ✅/⚠️ | Metrics 382→642. Iters 277-281 wrong-branch. 282-286 fast-forwarded canonical to main (633) + option-variant pairs.

### Iters 163–276 — ✅/⚠️ | Metrics 0→637. PR #148 merged 534 to main.

### Iters 1–162 — ✅/⚠️ | Metrics 0→508. Full baseline benchmarks established.
