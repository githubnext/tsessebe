# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-24T22:05:00Z |
| Iteration Count | 278 |
| Best Metric | 137 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | pending-ci |
| Issue | #1 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, pending-ci, accepted, pending-ci, accepted, accepted, accepted, pending-ci, pending-ci, pending-ci |

---

## 📋 Program Info

**Goal**: Build tsb — TypeScript port of pandas, one feature at a time.
**Metric**: pandas_features_ported (higher is better)
**Branch**: `autoloop/build-tsb-pandas-typescript-migration` | **PR**: pending-ci | **Issue**: #1

---

## 🎯 Current Priorities

Completed through iter 278:
- ✅ Core (iters 1–52): DataFrame, Series, Index, dtypes, I/O, groupby, merge, reshape, window
- ✅ Stats (iters 53–244): 185+ pandas ops ported
- ✅ join/joinAll/crossJoin, infer_objects/convertDtypes, merge_asof/ordered, resample, xs (246–254)
- ✅ toHtml/Markdown, toRecords/fromRecords, isocalendar, periodRange, options, pd.testing (256–258)
- ✅ hashPandasObject, caseWhen, fromDummies, strCat, asfreq, at_time, between_time (273–278)

Next:
- `Series.str.get_dummies` — split strings by delimiter → DataFrame
- `DataFrame.first` / `DataFrame.last` — select first/last n rows by offset
- `pd.wide_to_long` — wide format to long format transformation

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

- `str.extractall()` — wire via late-binding
- `asfreq` — convert DatetimeIndex to fixed frequency
- `str.wrap` / `str.center` / `str.ljust` / `str.rjust` — str accessor methods

---

## 📊 Iteration History
### Iteration 278 — 2026-04-24 22:05 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24913417796)

- **Status**: ⏳ pending-ci
- **Change**: +asfreqSeries/asfreqDataFrame, +atTimeSeries/betweenTimeSeries/atTimeDataFrame/betweenTimeDataFrame, +StringAccessor.extractAll
- **Metric**: 137 (previous best: 136, delta: +1)
- **Commit**: ad8bbf3
- **Notes**: Two new stats modules (asfreq.ts, time_selector.ts) with full test + property-based coverage; str.extractAll wired inline in StringAccessor to avoid circular deps.

### Iteration 277 — 2026-04-24 20:22 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24910082527)

- **Status**: ⏳ pending-ci
- **Change**: +strCat/strCatCollapse + Series.str.cat (pandas str.cat port)
- **Metric**: 136 (previous best: 135, delta: +1)
- **Commit**: 247a56f
- **Notes**: New src/stats/str_cat.ts with element-wise and collapse modes; str.cat() wired inline into StringAccessor to avoid circular deps.

### Iters 264–276 — ⏳/✅ (134→135): +fromDummies, +hashPandasObject, +caseWhen, +asfreq, +Styler, +strCat.
### Iters 258–263 — ⏳/✅ (134→135): +pd.testing, +hash, +case_when, +where/mask aligned.
### Iters 246–256 — ✅/⚠️ (128→134): +resample, +mergeOrdered/Asof, +join, +inferObjects, +str.normalize, +ewmCov/Corr, +xs, +toHtml/Markdown, +toRecords/fromRecords, +isocalendar, +periodRange.
### Iters 53–245 — ✅/⚠️ (8→128): 185+ pandas features ported.
