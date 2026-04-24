# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-24T06:41:58Z |
| Iteration Count | 287 |
| Best Metric | 638 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | — (pending CI) |
| Issue | #131 |
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
**Pull Request**: — (pending)
**Steering Issue**: #131

---

## 🎯 Current Priorities

*(No specific priorities set — agent is exploring freely.)*

---

## 📚 Lessons Learned

- **Key insight**: Canonical branch `autoloop/perf-comparison` must be fast-forwarded from main before adding new pairs. Iter 286's 9 pairs (642) were on a lost PR; main is at 633. Best effective baseline for iter 287 is 633 → 638.
- **Import paths**: `../../src/index.ts` not `"tsb"`. Series: `new Series({ data: [...] })`. DF: `DataFrame.fromColumns({...})`.
- **Standalones**: cummax/cummin/cumprod/cumsum/diff/explode/pct_change/seriesAbs/where/mask/sample/replace/astype/pivot.
- **groupby AggName**: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only.
- **merge_asof**: mergeAsof(left, right, { on: "key", direction: "backward"|"forward"|"nearest" }) — both DFs must be sorted by key.
- **crossJoin**: crossJoin(left, right) — for small DFs only (100×100 = 10k rows is a safe size).
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

### Iteration 287 — 2026-04-24T06:41 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24876099398)

- **Status**: ✅ Accepted (pending CI) · **Metric**: 638 (+5 vs main 633) · Fast-forward from main + 5 new pairs (merge_asof, merge_ordered, join, crossjoin, resample_agg)

### Iteration 286 — 2026-04-24T00:34 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24865965316)

- **Status**: ✅ Accepted · **Metric**: 642 (+4) · Fast-forward + 9 new pairs (merge_asof/ordered, resample_*, clip_with_bounds, infer_objects, eval_query)

### Iteration 285 — 2026-04-23T18:26 UTC — ✅ · Metric: 638 (+5) · Fast-forward + truncate/xs/update/str_findall pairs

### Iters 277–284 — ✅/⚠️ | Metrics 382→638. Iters 277-281 wrong-branch. 282-284 fast-forwarded canonical to main (633) + option-variant pairs.

### Iters 163–276 — ✅/⚠️ | Metrics 0→637. PR #148 merged 534 to main.

### Iters 1–162 — ✅/⚠️ | Metrics 0→508. Full baseline benchmarks established.
