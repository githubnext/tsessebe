# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-05-10T19:19:41Z |
| Iteration Count | 309 |
| Best Metric | 657 |
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

- **Import paths**: `../../src/index.ts` for Series/DataFrame; direct stats module for specific functions.
- **groupby AggName**: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only.
- **merge_asof**: mergeAsof(left, right, { on, direction: "backward"|"forward"|"nearest" }) — DFs must be sorted.
- **string_accessor**: `series.str.lower()`, `.strip()`, `.len()`, `.replace(pat, repl)`, `.split(sep)`.
- **Styler**: `dataFrameStyle(df).highlightMax().highlightMin().backgroundGradient().exportStyles()`.
- **corrWith**: `corrWith(df, seriesOther)` — DF as first arg, returns Series of correlations per column.
- **add_sub_mul_div/pow_mod/elem_ops/at_iat**: import from `../../src/stats/{module}.ts`; accept scalar or Series/DataFrame.

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

### Iteration 309 — 2026-05-10T19:19:41Z — [Run](https://github.com/githubnext/tsessebe/actions/runs/25637471523)

- **Status**: ✅ Accepted
- **Change**: Added 4 benchmark pairs: `add_sub_mul_div` (Series/DataFrame arithmetic), `at_iat` (scalar access by label and position), `elem_ops` (abs/round), `pow_mod` (power/modulo/floordiv)
- **Metric**: 657 (previous best on main: 653, state claimed 656 from unmerged commits; delta: +4 from real baseline) · **Commit**: 3c2a6fa
- **Notes**: State file best_metric was stale (commits a4252cf and d283599 from iters 307-308 not in repo history). Real baseline was 653; new count is 657.

### Iters 306–308 — ✅ | Metrics 651→653→655→656: replace/cum_ops, str_findall/combine, window_extended/str_findall/scalar_extract (commits missing from history).

### Iters 1–305 — ✅/⚠️ | Metrics 0→651. See git history on autoloop/perf-comparison branch.
