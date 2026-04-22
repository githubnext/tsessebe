# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-22T22:17:59Z |
| Iteration Count | 282 |
| Best Metric | 637 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | — (pending) |
| Steering Issue | #131 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, error, error, accepted, accepted, error, error, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Benchmark every tsb function vs pandas equivalent, one per iteration.
**Metric**: benchmarked_functions (higher is better)
**Branch**: [`autoloop/perf-comparison`](../../tree/autoloop/perf-comparison)
**Pull Request**: — (pending)
**Steering Issue**: #131

---

## 🎯 Current Priorities

*(No specific priorities set — agent is exploring freely.)*

---

## 📚 Lessons Learned

- **Iter 282**: Fast-forward canonical branch to main (ahead=0, behind=100). Added 4 new option-variant pairs: quantile_df_axis1, interpolate_df_axis1, ffill_bfill_df_limit, ffill_bfill_series_limit. Result: 637.
- **Best metric clarification**: Previous "639" was on a wrong branch that was never merged. Actual canonical best after iter 281 was 633 (from main). This iter adds 4 new pairs = 637.
- **Iter 281**: Canonical branch was at 508 (iter 158). Fast-forward merged main (633) + 6 new option-API pairs = 639 (push pending, never confirmed merged).
- **Key insight**: Previous iters 277-281 updated state file best_metric but committed to wrong/unmerged branches. Canonical `autoloop/perf-comparison` was still at 508 until this iter.
- **Iter 278**: Fixed 300+ API bugs (wrong names, method→standalone, rollingQuantile args, fromDictOriented). pgid kill. Result: 532.
- **subprocess timeout**: `Popen` + `start_new_session=True`, then `os.killpg(pgid, SIGKILL)`.
- **Import paths**: `../../src/index.ts` not `"tsb"`. Series: `new Series({ data: [...] })`. DF: `DataFrame.fromColumns({...})`.
- **Standalones**: cummax/cummin/cumprod/cumsum/diff/explode/pct_change/seriesAbs/where/mask/sample/replace/astype/pivot.
- **groupby AggName**: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only.
## 🚧 Foreclosed Avenues

- **Suffixed branches**: Never commit to `autoloop/perf-comparison-{suffix}` branches. Only `autoloop/perf-comparison` counts.
- **Sequential run_benchmarks.sh**: Old sequential approach is too slow for 508 pairs. Use parallel Python runner.
- **SSH push**: SSH to github.com is blocked in this runner environment.
- **HTTPS push without credentials**: git credential helper not configured; git push hangs waiting for input. Use safeoutputs push_to_pull_request_branch.

---

## 🔭 Future Directions

- **Add more benchmarks** (637 pairs on canonical branch):
  1. Continue adding option-variant benchmarks for axis/limit/method parameters
  2. Check for any new src/ modules added to the tsb library
  3. Look at interpolate limitDirection variants, quantile skipna variants, etc.

---

## 📊 Iteration History

### Iteration 282 — 2026-04-22T22:17 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24805528063)

- **Status**: ✅ Accepted (PR pending CI)
- **Change**: Fast-forward canonical branch to main (633) + 4 new option-variant pairs (quantile_df_axis1, interpolate_df_axis1, ffill_bfill_df_limit, ffill_bfill_series_limit)
- **Metric**: 637 (previous canonical: 633 from main, delta: +4)
- **Commit**: 1585784
- **Notes**: Previous "best_metric: 639" was on wrong branches. Canonical was at 633 (main). Added 4 new option-variant pairs covering axis=1 and limit parameters.

### Iteration 281 — 2026-04-22T15:59 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24788564007)

- **Status**: ✅ Accepted (pending CI)
- **Change**: Merge main (633 pairs) into canonical branch + 6 new option-variant pairs (any_all_axis1, nunique_axis1, diff_series_periods, shift_fillvalue, dataframe_diff_axis1, dataframe_shift_axis1)
- **Metric**: 639 (previous: 508 on canonical; after merge+new: 639)
- **Commit**: fcc5985

### Iteration 280 — 2026-04-22T08:37 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24768692351)

- **Status**: ✅ Accepted (push failed, canonical stayed at 508)
- **Change**: Merge main (633) + 6 new pairs (same strategy as iter 281 but push failed)
- **Metric**: 639 (claimed, but canonical was 508 after this run)

### Iter 277–280 — ✅/⚠️ mix | metrics 382→639 on canonical branch. Key: iters 277-279 committed to wrong/suffixed branches; iter 280 merged main (633) + 6 new on canonical; iter 281 merged main again (iter 158→633 on canonical) + 6 new option-API pairs.

### Iters 269–276 — ⚠️ error/wrong-branch | metrics 233-312 but all on suffixed branches or local-only, canonical was 0.

### Iters 258–268 — ✅ mix (wrong branches) | metrics claimed 604→610 but canonical was always 0.

### Iters 252–257 — ✅/⚠️ mix | metrics 534→543.

### Iters 163–251 — ✅/⚠️ mix | metrics 508→534. PR #148 merged 534 pairs to main.

### Iters 1–162 — all ✅/⚠️ | metrics 0→508. Full baseline benchmarks established.
