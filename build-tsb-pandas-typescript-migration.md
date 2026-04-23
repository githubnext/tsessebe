# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-23T19:32:00Z |
| Iteration Count | 268 |
| Best Metric | 135 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #207 |
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
**Branch**: `autoloop/build-tsb-pandas-typescript-migration` | **PR**: #207 | **Issue**: #1

---

## 🎯 Current Priorities

Completed through iter 268 (on main through iter ~258, pending-ci 259–268):
- ✅ Core (iters 1–52): DataFrame, Series, Index, dtypes, I/O, groupby, merge, reshape, window
- ✅ Stats (iters 53–244): 185+ pandas ops ported
- ✅ join/joinAll/crossJoin, infer_objects/convertDtypes, merge_asof/ordered, resample, xs (246–254)
- ✅ toHtml/Markdown, toRecords/fromRecords, isocalendar, periodRange, options, pd.testing (256–258)
- ✅ hashPandasObject, case_when, where/mask aligned, Styler, caseWhen (261–266, pending-ci)
- ✅ fromDummies — inverse of getDummies, reconstruct categorical from indicators (iter 267, pending-ci)
- ✅ hashPandasObject (pd.util.hash_pandas_object) — FNV-1a row/element hashing (iter 268, pending-ci)

Next:
- `str.extractall()` — wire via late-binding (inject DataFrame factory into StringAccessor)
- `df.asfreq()` — convert time series to a fixed frequency
- `pd.from_dummies()` — inverse of getDummies (if not yet on branch)

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
- `df.asfreq()` — convert time series to a fixed frequency
- `pd.from_dummies()` — inverse of getDummies

---

## 📊 Iteration History
### Iter 268 — 2026-04-23 19:32 UTC — ⏳ pending-ci — +hashPandasObject: FNV-1a row/element hashing for Series/DataFrame; index mixing + hashKey seed. Metric: 135. Commit: a14f850. [Run](https://github.com/githubnext/tsessebe/actions/runs/24854706474)
### Iter 267 — 2026-04-23 18:51 UTC — ⏳ pending-ci — +fromDummies: inverse of getDummies; groups columns by prefix. Metric: 136. Commit: 93464fa.
### Iters 264–266 — ⏳ pending-ci (135): +Styler, +case_when/caseWhen.
### Iters 258–263 — ⏳/✅ (134→135): +pd.testing, +hash, +case_when, +where/mask aligned.
### Iters 246–256 — ✅/⚠️ (128→134): +resample, +mergeOrdered/Asof, +join, +inferObjects, +str.normalize, +ewmCov/Corr, +xs, +toHtml/Markdown, +toRecords/fromRecords, +isocalendar, +periodRange.
### Iters 53–245 — ✅/⚠️ (8→128): 185+ pandas features ported.
