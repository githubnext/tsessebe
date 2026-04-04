# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-04T18:11:27Z |
| Iteration Count | 32 |
| Best Metric | 37 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | — |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Build `tsb`, a complete TypeScript port of pandas, one feature at a time.
**Metric**: `pandas_features_ported` (higher is better)
**Branch**: [`autoloop/build-tsb-pandas-typescript-migration`](../../tree/autoloop/build-tsb-pandas-typescript-migration)
**Pull Request**: —
**Steering Issue**: —

---

## 🎯 Current Priorities

Iter 32 complete (value_counts/crosstab). Next candidates:
- `apply` / `applyMap` — element-wise function application on Series/DataFrame
- `cut` / `qcut` — binning (was in lost iter 31, needs rebuild)
- `get_dummies` — one-hot encoding (was in lost iter 31, needs rebuild)
- `to_datetime` / `to_timedelta` — parsing utilities (was in lost iters 29-31, needs rebuild)
- ✅ Done through Iter 32: datetime, sort, indexing, compare, reshape, window, I/O, stats, categorical, MultiIndex, Timedelta, IntervalIndex, CategoricalIndex, DatetimeIndex, **value_counts/crosstab**.

---

## 📚 Lessons Learned

- **General**: `exactOptionalPropertyTypes`: use `?? null` not undefined. `noUncheckedIndexedAccess`: guard array accesses. Complexity ≤15: extract helpers. `useBlockStatements`: braces everywhere. `useTopLevelRegex`: move regex to top level. `useNumberNamespace`: `Number.NaN`. `import fc from "fast-check"` (default import). `biome check --write --unsafe` auto-fixes Array<T>→T[].
- **Imports**: `useImportRestrictions` — import from `../../src/index.ts` not direct files (tests), import from barrel `../core/index.ts` not direct files (other src). `import type` for type-only imports. Circular ESM deps (strings/datetime/categorical) are fine.
- **Build env**: `bun` not available — use `npm install` then `node_modules/.bin/biome` and `node_modules/.bin/tsc`. Pre-existing TS errors in window/io/tests — only validate new file has 0 errors. `create_pull_request` safeoutputs tool fails with "no commits found" — persistent issue; accepted iterations accumulate on branches without auto-PR. `useDefaultSwitchClause` requires `default:` in every switch statement.
- **frequency.ts** (Iter 32): `readonly Array<T>` → use `ReadonlyArray<T>` in function parameters (TS doesn't accept `readonly T[]` notation in all contexts). `Index` constructor takes `(data, name?)` not `(data, {name})`. `noExcessiveCognitiveComplexity` ≤15 — extract `resolveAxisName`, `keyToColName` helpers from `crosstab`. `noNestedTernary` — convert chained ternary to `if`/`else` in a helper function. State file note: iters 26-31 branches were lost; best_metric reset from 40 to 37 (actual verifiable count from datetime-tz-25 + frequency.ts).
- **get_dummies** (Iter 30): `df.columns` is `Index<string>` (not a Map!) — use `df.columns.values` for column names array and `df.get(colName)` for column Series. `getDummies` takes Series, `getDummiesDataFrame` takes DataFrame. ISO duration parsing (P1DT2H) needs separate helper `calcIsoMs` to keep CC≤15.
- **to_datetime** (Iter 29): Extract `onParseError(raw, fmt, errors)` + `parseStringVal(val, opts)` helpers from `coerceOne` to keep CC≤15. strptime via `buildStrptimeRegex` + capture group list + `applyCapture` state mutation. `DIRECTIVE_RE = /%[YymdHIMSfp%]/g` at top level. `resolveHour12` separate helper. 12h clock requires `state.hour12` flag.
- **DatetimeIndex** (Iter 25): `Date` is not a `Label` (Label = number|string|boolean|null), so `DatetimeIndex` cannot extend `Index<T>`. Implement as standalone class with own `_values: readonly Date[]` and Index-like interface. Timezone handling via `Intl.DateTimeFormat.formatToParts` works without dependencies but `applyPart` helper must be split from `applyParts` to keep cognitive complexity ≤15.
- **CategoricalIndex** (Iter 24): Extends `Index<Label>` via `super(cat.toArray(), name)`. `fromCategorical` factory. Monotonicity uses category-position codes when `ordered=true`. Direct import from `./categorical.ts` avoids circular dep.
- **IntervalIndex** (Iter 23): Standalone numeric type. `intervalsOverlap` helper. `resolveRangeParams` extractor. `maskContains`/`maskOverlaps` for vectorized ops.
- **Timedelta** (Iter 22): Store as ms integer. `floorDiv`/`floorMod` helpers. `Timedelta` NOT in `Scalar` type. Two top-level regex (PANDAS_RE + UNIT_RE).
- **MultiIndex** (Iter 21): levels+codes compressed storage. Complexity extractors. Avoid `toFrame()` (circular dep); use `toRecord()`.
- **Stats** (Iter 19): skew/kurtosis use sample std (ddof=1).
- **Merge** (Iter 10): composite keys use `\x00`+`__NULL__` for nulls; sentinel `-1` = right-only row.

---

## 🔭 Future Directions

### Phase 1 — Core Foundation ✅ Done
Index, Dtype, Series, DataFrame all implemented.

### Phase 2 — Operations ✅ Done
- ~~Arithmetic~~ ✅ (Iter 8) · ~~String accessor~~ ✅ (Iter 9) · ~~DateTime accessor~~ ✅ (Iter 12)
- ~~Missing data~~ ✅ (Iter 11) · ~~Groupby~~ ✅ (Iter 6) · ~~concat~~ ✅ (Iter 7) · ~~merge~~ ✅ (Iter 10)
- ~~Sorting utilities~~ ✅ (Iter 13) · ~~Indexing/selection~~ ✅ (Iter 14) · ~~Comparison/boolean ops~~ ✅ (Iter 15) · ~~Reshaping~~ ✅ (Iter 16) · ~~Window functions~~ ✅ (Iter 17)
- ~~**I/O utilities**~~ ✅ (Iter 18) · ~~**Statistical functions**~~ ✅ (Iter 19) · ~~**Categorical data**~~ ✅ (Iter 20)
- ~~**MultiIndex**~~ ✅ (Iter 21)
- ~~**Timedelta**~~ ✅ (Iter 22)
- ~~**IntervalIndex**~~ ✅ (Iter 23)
- ~~**CategoricalIndex**~~ ✅ (Iter 24)
- ~~**DatetimeIndex / DatetimeTZDtype**~~ ✅ (Iter 25)
- ~~**to_datetime / strptime**~~ ✅ (Iter 29)
- ~~**to_timedelta / TimedeltaIndex**~~ ✅ (Iter 29)

- ~~**get_dummies**~~ ✅ (Iter 31)
- ~~**cut / qcut**~~ ✅ (Iter 31)
- ~~**to_datetime**~~ ✅ (Iter 31)
- ~~**to_timedelta**~~ ✅ (Iter 31)

### Phase 3+ — Advanced
**Next candidates**:
- `read_parquet` — binary Parquet I/O via pure TS (complex)
- `plotting` — Vega/Canvas-based charting (complex)
- `apply` / `applyMap` — element-wise function application
- `value_counts` / `crosstab` — frequency tabulation

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 32 — 2026-04-04 18:11 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23984617988)

- **Status**: ✅ Accepted
- **Change**: `src/stats/frequency.ts` — `valueCounts` (standalone, with normalize/sort/ascending/dropna) + `crosstab` (with margins, normalize all/index/columns, aggfunc+values, dropna). 25 unit+property-based tests. Playground page added.
- **Metric**: 37 (verifiable baseline 36 from datetime-tz-25, delta: +1) · **Commit**: 8192426
- **Notes**: State reset from 40→37 because iters 26-31 branches are all lost remotely. `ReadonlyArray<T>` needed (not `readonly Array<T>`). `Index` constructor is `(data, name?)`. Extract `resolveAxisName`+`keyToColName` to keep CC≤15. `noNestedTernary` requires helper function for chained ternary.

### Iteration 31 — 2026-04-04 17:44 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23984162858)

- **Status**: ✅ Accepted (branch 82bb36a lost — not accessible remotely)
- **Change**: `cut.ts` + `get_dummies.ts` + `to_datetime.ts` + `to_timedelta.ts` — binning, one-hot encoding, datetime/timedelta parsing. Built on datetime-tz-25 remote branch.
- **Metric**: 40 (previous best: 39, delta: +1) · **Commit**: 82bb36a (lost)

### Iterations 19–29 (summary)
- Iter 29 ✅ to_timedelta/TimedeltaIndex re-impl (38) · Iter 28 ✅ to_datetime/to_timedelta re-impl (38) · Iter 27 ✅ to_timedelta (branch lost) · Iter 26 ✅ to_datetime (branch lost) · Iter 25 ✅ DatetimeIndex/date_range (36)
- Iter 24 ✅ CategoricalIndex (35) · Iter 23 ✅ IntervalIndex (34) · Iter 22 ✅ Timedelta (33) · Iter 21 ✅ MultiIndex (32)
- Iter 20 ✅ Categorical/CategoricalDtype/CategoricalAccessor/factorize (31) · Iter 19 ✅ stats: describe/corr/cov/skew/kurtosis (30)

### Iterations 1–18 (summary)
- Iter 18 ✅ I/O: readCsv/readJson/toCsv/toJson (26) · Iter 17 ✅ window: rolling/expanding/ewm (22) · Iter 16 ✅ reshape: pivot/melt/stack (19)
- Iter 15 ✅ compare.ts (16) · Iter 14 ✅ indexing.ts (15) · Iter 13 ✅ sort.ts (14)
- Iter 12 ✅ datetime.ts (13) · Iter 11 ✅ missing.ts (12) · Iter 10 ✅ merge (11) · Iter 9 ✅ strings.ts (10)
- Iter 8 ✅ ops.ts (9) · Iter 7 ✅ concat (8) · Iter 6 ✅ GroupBy (7) · Iter 5 ✅ DataFrame (6) · Iter 4 ⚠️ Error · Iter 3 ✅ Dtype+Series (5) · Iter 2 ✅ Index+Dtype (4) · Iter 1 ✅ Foundation (1)
