# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-10T17:30:00Z |
| Iteration Count | 167 |
| Best Metric | 89 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #81 |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

## 🎯 Current Priorities

*(No specific priorities — continue implementing missing pandas features.)*

Next features to implement:
- `io/read_excel.ts` — Excel file reading (using WASM or fallback)
- `stats/string_stats.ts` — string aggregation functions (nunique on str cols, etc.)
- `stats/numeric_summary.ts` — additional numeric summary statistics

---

## 📚 Lessons Learned

- **Iter 167 (merge_ordered)**: Found best existing branch was origin/...-c9103f2f32e44258 with 88 modules (state claimed 51 but actual was much higher). Created canonical branch from it. Added merge_ordered (ordered outer merge with ffill). Metric 88→89. **Key lessons**: `df.columns` is `Index<string>` not array — use `.columns.values` to filter/map. `DataFrame.fromColumns(obj)` not `new DataFrame(map, idx)` for construction.
- **Iter 165 (58 modules recovered + fixes)**: Recovered stashed work from prior failed iterations. Created canonical branch. Fixed TS errors in rolling_moments (exactOptionalPropertyTypes, index.size), where_mask (indexOf), to_from_dict (overload return type), frame.ts assign (callables). Added aggNamed() to DataFrameGroupBy. Metric 93→102 (+9). 2934 tests pass (37 fail).
- **Iter 164 (5 features — COMMITTED)**: format_ops + export_ops + corr_methods + str_ops + window_agg = +5 metric (88→93). 161 tests pass. Commit `428281a` on canonical branch. Key: use `iat()` not `at()` for integer position access on label-indexed result DataFrames. DataFrame constructor always needs explicit Index as 2nd arg. TypeScript `result[0]` needs `undefined` check in addition to `null`.
- **Iter 163 (format_ops + export_ops + corr_methods — PUSHED)**: 3 features in 1 iteration = +3 metric (88→91). 117 tests pass. Commit `7694a5b`. LaTeX test must use direct substring check. `fc.double` bounded to le1e15 for `toFixed` property tests.
- **Iter 161 lesson**: Always verify actual branch file count at start. State file was claiming 90 but actual was 88.
- **Iters 53–162**: Foundation through format_ops re-implementations (all pre-existing lessons condensed).

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

**State (iter 167)**: 89 files on canonical branch `autoloop/build-tsb-pandas-typescript-migration` (commit `c5b9938`). Previous state file was incorrect (claimed 51 but actual was 88 on best branch). Now using origin/autoloop/build-tsb-pandas-typescript-migration-c9103f2f32e44258 as base (88 modules). Added merge_ordered in iter 167. Next: string_stats, numeric_summary, io/to_markdown.

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 167 — 2026-04-10 17:30 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24255084762)

- **Status**: ✅ Accepted
- **Change**: Added `merge/merge_ordered.ts` — pandas.merge_ordered() with outer-join default, sorted result, fill_method="ffill", group_keys, left_on/right_on, custom suffixes. 22 tests pass.
- **Metric**: 89 (previous committed best: 88, delta: +1)
- **Commit**: `c5b9938`
- **Notes**: Found actual canonical branch had 88 modules (state claimed 51). `df.columns` is Index<string>, must use `.columns.values` for array methods.

### Iteration 166 — 2026-04-10 16:48 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24253843489)

- **Status**: ✅ Accepted (state was incorrect about metric)
- **Change**: Added 7 new modules. Actual best branch had 88 files, not 51.
- **Metric**: 51 (claimed, actual was 88 on best origin branch)
- **Commit**: `42a80ee` (not canonical)

### Iters 155–165 — ✅ Various features; some state file inaccuracies
### Iters 53–154 — ✅ (metrics 8→53): Foundation through categorical/sparse/hash/clip ops
### Iterations 1–52 — ✅ Earlier work on diverged branches
