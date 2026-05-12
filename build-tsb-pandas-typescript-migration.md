# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-05-12T07:25:00Z |
| Iteration Count | 310 |
| Best Metric | 144 |
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
| Recent Statuses | pending-ci, pending-ci, pending-ci, accepted, pending-ci, accepted, pending-ci, accepted, pending-ci, accepted |

---

## 📋 Program Info

**Goal**: Build tsb — TypeScript port of pandas, one feature at a time.
**Metric**: pandas_features_ported (higher is better)
**Branch**: `autoloop/build-tsb-pandas-typescript-migration` | **PR**: #248 | **Issue**: #1

---

## 🎯 Current Priorities

- ✅ Core + Stats + IO + Merge + Reshape + Window + GroupBy complete (iters 1–295)
- ✅ pd.api.extensions (ExtensionDtype, ExtensionArray, accessor registration) added (iter 310)
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

- More `pd.api.types` predicates
- `DataFrame.xs()` improvements (multi-level key lookup)
- Full `groupby(Grouper)` integration
- `pd.array()` factory function for creating ExtensionArrays

---

## 📊 Iteration History

### Iteration 310 — 2026-05-12 07:25 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25719465265)

- **Status**: pending-ci
- **Change**: Add `pd.api.extensions` — ExtensionDtype, ExtensionArray, registerExtensionDtype, accessor registration (Series/DataFrame/Index)
- **Metric**: 144 (previous best on main: 143, delta: +1)
- **Commit**: 65e2421
- **Notes**: Mirrors pandas.api.extensions. Abstract base classes enforce implementation. Available as `api.extensions` sub-namespace.

### Iters 273–309 — accepted/pending-ci (130→144): +Grouper, +lreshape, +str ops, +swapaxes, +readFwf, +unionCategoricals, +info, +extractAll, +rows, +monthName/dayName, +itertuples, +dropLevel, +flags, +to_html, +hashPandasObject, +hashArray/iteritems, +Grouper spec, +api.indexers, +Series.map/hashBiject, +pd.options, +pd.api namespace, +interval_range, +period_range/pd.util, +infer_freq.

### Iters 1–272 — accepted (0→130): full pandas core + stats + io + merge + reshape + window + groupby.
