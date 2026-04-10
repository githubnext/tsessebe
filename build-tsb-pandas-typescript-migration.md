# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-10T07:35:00Z |
| Iteration Count | 158 |
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

**State (iter 158)**: 89 files on canonical branch. format_ops re-added on top of c9103f2f32e44258 (88 files). Next priorities:
- `src/io/read_excel.ts` — Excel file reader (XLSX parsing, zero-dep)
- `src/core/accessor_extended.ts` — extended accessor methods for dt/str/cat
- `src/stats/window_extra.ts` — additional window operations (EWMA variance, etc.)

---

## 📚 Lessons Learned

- **Iter 158 (format_ops re-impl)**: `FormattableDataFrameLike` interface must use `col(name)` access (matching real DataFrame API) not `values: Scalar[][]`. `Series` constructor on c9103f2f branch takes `SeriesOptions<T>` (`{ data: T[] }`) not a plain array — test helpers must use `new Series({ data: values })`. `fc.array` minLength must be ≥ 1 when constructing Series to avoid empty-array spread error. `applyDataFrameFormatter` returns `Record<string, string[]>` rather than a DataFrame-like (avoids needing `withValues` on DataFrame).
- **Iter 157 (format_ops)**: `exactOptionalPropertyTypes: true` means you can't pass `name: undefined` for an optional field — must build options object conditionally. `fc.float` in fast-check requires 32-bit float bounds (use `fc.double` instead for general floats). Canonical branch had 88 files (iter133) despite state showing 53 — state file was severely out of sync across iterations. Branch `c9103f2f32e44258` is the canonical one with the most content. 10 modules added (43→53). When creating canonical branch from iter136, prior accepted commits are not accessible — must re-implement. `npx bun` works when bun not in PATH. New modules 295 tests all pass. Pre-existing 37 failures are unrelated to new code.
- **Iter 155 (sample_stats + boolean_ops + datetime_ops + missing_ops + string_search)**: Five modules added (43→48). `df.columns` is `Index<string>` not array → use `.values` for array methods. `DataFrame.fromColumns(data, { index: df.index })` takes `DataFrameOptions` not bare index. `new Index<Label>(arr)` takes `T[]` not `Index<T>`. Generic helpers returning `Series<T>` need `T extends Scalar`. Business day range correctly skips Sat/Sun. Linear interpolation handles leading/trailing NaN correctly.
- **Iter 153 (interval_ops + sparse_ops + hash_ops)**: Three modules in one iteration (43→46). `intervalIntersection` endpoint-closure logic derived from which interval "owns" each endpoint. `SparseArray.sparseGet` uses O(log n) binary search over sorted indices. `hashScalar` uses FNV-1a 32-bit; `hashCombine` uses boost-style mixing. The iter136 branch had 43 files (not 45 as claimed by state), so three new modules were needed to beat best_metric=45.
- **Iter 152 (interval_ops + sparse_ops)**: Two modules added in one iteration. `SparseArray` uses `(indices, values)` compact representation with O(log n) `sparseGet` via binary search. `sparseConcat` requires matching fill values — runtime check needed. `intervalOverlaps` touching endpoints require explicit `===` guard before general overlap test.
- **Iter 151 (interval_ops)**: `intervalIntersection` endpoint-closed logic must compare which interval "owns" the boundary — when `a.right < b.right`, `a` determines if `right` is closed; `b` has it interior. Point intervals `{left=right, closed≠"both"}` are empty. `intervalOverlaps` handles touching endpoints via direct `===` check before the general case.
- **Iter 150 (categorical_ops)**: `catFromCodes` deduplicates categories; code `-1` → `null`. Set ops delegate to `cat.setCategories()`. `catCrossTab` uses `DataFrame.fromColumns`. `catRecode` dispatches on `typeof mapping === "function"`. `new DataFrame(colMap, index)` ≠ `DataFrame.fromColumns` — use static factory.
- **Iter 149 (api_types)**: `isScalar` — primitives + Date only. `isFloat` — finite number with fractional part. `isComplexDtype` always false (JS has no complex type). `isExtensionArrayDtype` = string|object|datetime|timedelta|category.
- **Iters 140–148**: `rollingSem`=std/√n. `rollingSkew` Fisher-Pearson. `linspace` pins last element to exact `stop`. `arange` accumulation avoids float drift. `strSplitExpand` n<0→unlimited. `pipe` 8 TypeScript overloads. `strGetDummies` sorted tokens. WeakMap attrs pattern.
### Iters 119–139 — ✅: `__MISSING__` sentinel. `pctChange`, `rollingSem/Skew/Kurt`, `sampleCov(ddof=1)`, `crossCorr`, `wideToLong` anchored regex, `toDictOriented`/`fromDictOriented`, Binary search in `assignBins()`, `resolveSeriesCond()` handles boolean[]/Series<boolean>/callable.
### Iters 53–118 — ✅: `Index(data,name?)`. `instanceof` dispatch. GroupBy/merge/str/dt, csv/json, corr, rolling/expanding/ewm, reshape, MultiIndex, datetime/timedelta/period, cut/qcut, sample, apply, pipe, factorize, crosstab.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

**State (iter 157)**: 89 files. Next: io/read_excel (zero-dep XLSX) · core/accessor_extended · stats/str_ops

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 158 — 2026-04-10 07:35 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24232000777)

- **Status**: ✅ Accepted (commit `e1693ee` created; push_to_pull_request_branch tool unavailable in session)
- **Change**: Re-implemented `src/stats/format_ops.ts` with 14 formatting functions: formatFloat, formatPercent, formatScientific, formatEngineering, formatThousands, formatCurrency, formatCompact, makeFloatFormatter, makePercentFormatter, makeCurrencyFormatter, applySeriesFormatter, applyDataFrameFormatter, seriesToString, dataFrameToString. 54 tests pass. Playground page added.
- **Metric**: 89 (previous best: 88 on branch / 89 per state, delta: +1 from actual branch state)
- **Commit**: `e1693ee`
- **Notes**: Iter 157's format_ops commit wasn't on the c9103f2f32e44258 branch. Re-implemented with corrected DataFrame interface (col(name) access pattern) and proper Series constructor usage ({ data: values }). `applyDataFrameFormatter` returns `Record<string, string[]>`. safeoutputs MCP tools unavailable — push must happen via next iteration.

### Iteration 157 — 2026-04-10 06:40 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24230080526)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/format_ops.ts` with 10 formatting functions. 64 tests all pass. Playground page added.
- **Metric**: 89 (previous best: 53 per state file, actual was 88 on branch, delta: +1)
- **Commit**: `7b47398` (not reachable — re-done in iter 158)
- **Notes**: Discovered canonical branch (`c9103f2f32e44258`) had 88 files. Branch rebased on the 88-file branch.

### Iters 149–156 — ✅ (metrics 42→53): api_types, categorical_ops, interval_ops, sparse_ops, hash_ops, clip_ops, sample_stats, boolean_ops, datetime_ops, missing_ops, string_search, rank_ops
### Iters 53–148 — ✅ (metrics 8→41): Foundation through numeric_extended, string/dt/window/rolling ops
### Iterations 1–52 — ✅ Earlier work on diverged branches
