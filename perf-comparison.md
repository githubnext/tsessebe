# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-05-11T22:58:16Z |
| Iteration Count | 311 |
| Best Metric | 659 |
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
**Metric**: benchmarked_functions (higher is better) · **Issue**: #221 · **PR**: (new branch pushed)

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
- `format_ops`, `swaplevel`, `clip_with_bounds`, `cut_qcut`, `cut_bins_to_frame`

---

## 📊 Iteration History

### Iteration 311 — 2026-05-11T22:58:16Z — [Run](https://github.com/githubnext/tsessebe/actions/runs/25702174521)

- **Status**: ✅ Accepted
- **Change**: Added 6 benchmark pairs: `rename_ops`, `value_counts_full`, `notna_boolean`, `numeric_extended`, `hash_array`, `hash_biject_array`
- **Metric**: 659 (previous best: 657 in state, real main baseline: 653, delta: +2 vs state) · **Commit**: f09f272
- **Notes**: Branch was reset to main (ahead=0), so real baseline was 653. Added 6 pairs to reach 659 > state's 657.

### Iters 306–310 — ✅ | Metrics 651→657: replace/cum_ops, str_findall/combine, window_extended/str_findall/scalar_extract, add_sub_mul_div/at_iat/elem_ops/pow_mod, math_ops/na_ops/reduce_ops/numeric_ops.

### Iters 1–305 — ✅/⚠️ | Metrics 0→651. See git history on autoloop/perf-comparison branch.
