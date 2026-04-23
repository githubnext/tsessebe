# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-23T13:00:00Z |
| Iteration Count | 264 |
| Best Metric | 135 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | pending-ci |
| Issue | #1 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | pending-ci, pending-ci, pending-ci, accepted, pending-ci, accepted, accepted, accepted, pending-ci, pending-ci |

---

## 📋 Program Info

**Goal**: Build tsb — TypeScript port of pandas, one feature at a time.
**Metric**: pandas_features_ported (higher is better)
**Branch**: `autoloop/build-tsb-pandas-typescript-migration` | **PR**: pending-ci | **Issue**: #1

---

## 🎯 Current Priorities

Completed through iter 261:
- ✅ Core (iters 1–52): DataFrame, Series, Index, dtypes, I/O, groupby, merge, reshape, window
- ✅ Stats (iters 53–238): 185+ pandas ops ported
- ✅ swaplevel, truncate, between, update, filter_labels, combine (iters 239–244)
- ✅ rename_ops, math_ops, dot_matmul, transform_agg, map_values, at_iat (iters 239–244)
- ✅ join/joinAll/crossJoin, infer_objects/convertDtypes, merge_asof/ordered (iters 246–252)
- ✅ resample, str.normalize, ewmCovMatrix/ewmCorrMatrix, xs (iters 251–254)
- ✅ dataFrameToHtml/Markdown, dataFrameToRecords/fromRecords, dtIsocalendar, periodRange (iter 256)
- ✅ getOption/setOption/resetOption/describeOption/listOptions (iter 257)
- ✅ pd.testing: assertSeriesEqual/assertFrameEqual/assertIndexEqual (iter 258)
- ✅ hashPandasObject/hashSeries/hashDataFrame (iter 261)
- ✅ case_when — caseWhenSeries/caseWhenDataFrame (iter 262)
- ✅ where/mask aligned — whereSeriesAligned/maskSeriesAligned/whereDataFrameSeries/maskDataFrameAligned etc. (iter 263)
- ✅ Styler (DataFrame.style API) — fluent CSS styling + toHtml/toLatex (iter 264)

Next:
- `DataFrame.pipe()` / `Series.pipe()` with arbitrary function composition
- `core/str_accessor` — wire `.str.extractall()` via late-binding

---

## 📚 Lessons Learned

- **CI type errors**: `Index<Label>.size` not `.length`. `Series<Scalar>`. Use `.values` for `Index<string>` compare. Non-null `arr[i]!` for noUncheckedIndexedAccess.
- **Biome**: `useBlockStatements`. `Number.NaN`/`Number.POSITIVE_INFINITY`. Default import fc. `import type` for value-unused imports.
- **Label now includes Date**: Fix 8d2e375 added `Date` to `Label` union.
- **Biome imports**: `src/stats/*.ts` imports from `../core`, `../types.ts`, or siblings only. Tests import from `../../src/index.ts`.
- **TypeScript**: `(v as unknown) instanceof X`. `as Scalar`/`as number` for noUncheckedIndexedAccess. `df.columns.values` not `.map(String)`.
- **MultiIndex**: `mi as unknown as Index<Label>`. `mi.at(i)` returns `readonly Label[]`. `mi.size`.
- **Circular deps**: `string_accessor.ts` cannot import `DataFrame`.
- **Label comparison**: `(v as unknown as number) < (bound as unknown as number)` for `<`/`>`.
- **CI action_required**: Means workflow needs human approval, not test failure. Real results from push-triggered CI runs.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

- `core/str_accessor` — wire `.str.extractall()` via late-binding (inject DataFrame factory)
- `DataFrame.pipe()` / `Series.pipe()` with arbitrary function composition
- `df.where(cond, other=df2)` — fill-with-other-dataframe variant

---

## 📊 Iteration History
### Iter 264 — 2026-04-23 13:00 UTC — ⏳ pending-ci — +Styler/dataFrameStyle (DataFrame.style API): highlightMax/Min/Null/Between, backgroundGradient, textGradient, barChart, format, apply/applymap, toHtml, toLatex. Metric: 135. Commit: 2719284. [Run](https://github.com/githubnext/tsessebe/actions/runs/24838264967)
### Iters 258–263 — ⏳/✅ (134→135): +pd.testing, +hash, +case_when, +where/mask aligned.
### Iters 246–256 — ✅/⚠️ (128→134): +resample, +mergeOrdered/Asof, +join, +inferObjects, +str.normalize, +ewmCov/Corr, +xs, +toHtml/Markdown, +toRecords/fromRecords, +isocalendar, +periodRange.
### Iters 53–245 — ✅/⚠️ (8→128): 185+ pandas features ported.
