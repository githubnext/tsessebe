# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-05-13T01:14:00Z |
| Iteration Count | 311 |
| Best Metric | 145 |
| Target Metric | — |
| Metric Direction | higher |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | — |
| Issue | #1 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | pending-ci, pending-ci, pending-ci, pending-ci, accepted, pending-ci, accepted, pending-ci, accepted, pending-ci |

---

## 📋 Program Info

**Goal**: Build tsb — TypeScript port of pandas, one feature at a time.
**Metric**: pandas_features_ported (higher is better)
**Branch**: `autoloop/build-tsb-pandas-typescript-migration` | **PR**: #248 | **Issue**: #1

---

## 🎯 Current Priorities

- ✅ Core + Stats + IO + Merge + Reshape + Window + GroupBy complete (iters 1–295)
- ✅ pd.api.extensions (ExtensionDtype, ExtensionArray, accessor registration) added (iter 310)
- ✅ pdArray() / pd.array() factory function added (iter 311)
- Next: DataFrame.xs() improvements, groupby(Grouper) integration, more pd.api.types predicates

---

## 📚 Lessons Learned

- **CI type errors**: Non-null `arr[i]!` for noUncheckedIndexedAccess. `as Scalar`/`as number` casts.
- **Biome**: `useBlockStatements`. `Number.NaN`. Default import fc. `import type` for unused imports.
- **Imports**: `src/stats/*.ts` from `../core`, `../types.ts`. Tests from `../../src/index.ts`.
- **MultiIndex**: `mi as unknown as Index<Label>`. `mi.at(i)` returns `readonly Label[]`.
- **Circular deps**: `string_accessor.ts` cannot import `DataFrame`.
- **DataFrame construction**: Use `DataFrame.fromColumns({...})`. Options `{ index: [...] }` (not plain array).
- **Tests**: Avoid fast-check unless confirmed installed. No `new DataFrame({...})` — use `.fromColumns`.
- **Extensions**: Abstract classes with `abstract get` work well. Use `static override` for class methods.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

- `DataFrame.xs()` improvements (multi-level key lookup)
- Full `groupby(Grouper)` integration

---

## 📊 Iteration History

### Iteration 311 — 2026-05-13 01:14 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25771877156)

- **Status**: pending-ci
- **Change**: Add `pdArray()` — `pd.array()` factory function with dtype inference and `PandasArray` class
- **Metric**: 145 (previous best: 144, delta: +1)
- **Commit**: 73915da
- **Notes**: Mirrors `pandas.array()`. Infers int64/float64/bool/string/datetime from data. Iterable protocol. Full tests and playground page.

### Iters 273–310 — accepted/pending-ci (130→144): +Grouper, +lreshape, +str ops, +swapaxes, +readFwf, +unionCategoricals, +info, +extractAll, +rows, +monthName/dayName, +itertuples, +dropLevel, +flags, +to_html, +hashPandasObject, +hashArray/iteritems, +Grouper spec, +api.indexers, +Series.map/hashBiject, +pd.options, +pd.api namespace, +interval_range, +period_range/pd.util, +infer_freq, +pd.api.extensions.

### Iters 1–272 — accepted (0→130): full pandas core + stats + io + merge + reshape + window + groupby.
