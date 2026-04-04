# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-04T16:55:00Z |
| Iteration Count | 29 |
| Best Metric | 38 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration-to-datetime-29` |
| PR | — |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Build `tsb`, a complete TypeScript port of pandas, one feature at a time.
**Metric**: `pandas_features_ported` (higher is better)
**Branch**: [`autoloop/build-tsb-pandas-typescript-migration-to-datetime-29`](../../tree/autoloop/build-tsb-pandas-typescript-migration-to-datetime-29)
**Pull Request**: —
**Steering Issue**: —

---

## 🎯 Current Priorities

Iterations 12–29 all complete. Next: `get_dummies`, `cut`/`qcut`, or `read_parquet`.
- ✅ Done through Iter 29: datetime, sort, indexing, compare, reshape, window, I/O, stats, categorical, MultiIndex, Timedelta, IntervalIndex, CategoricalIndex, DatetimeIndex, to_datetime, to_timedelta/TimedeltaIndex.

---

## 📚 Lessons Learned

- **General**: `exactOptionalPropertyTypes`: use `?? null` not undefined. `noUncheckedIndexedAccess`: guard array accesses. Complexity ≤15: extract helpers. `useBlockStatements`: braces everywhere. `useTopLevelRegex`: move regex to top level. `useNumberNamespace`: `Number.NaN`. `import fc from "fast-check"` (default import). `biome check --write --unsafe` auto-fixes Array<T>→T[].
- **Imports**: `useImportRestrictions` — import from `../../src/index.ts` not direct files (tests), import from barrel `../core/index.ts` not direct files (other src). `import type` for type-only imports. Circular ESM deps (strings/datetime/categorical) are fine.
- **Build env**: `bun` not available — use `node_modules/.bin/biome` and `node_modules/.bin/tsc`. Pre-existing TS errors in window/io/tests — only validate new file has 0 errors. `create_pull_request` safeoutputs tool fails with "no commits found" — persistent issue; accepted iterations accumulate on branches without auto-PR. `useDefaultSwitchClause` requires `default:` in every switch statement.
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

### Phase 3+ — Advanced
**Next candidates**:
- `get_dummies` — one-hot encoding of categorical variables
- `cut` / `qcut` — binning of continuous variables
- `read_parquet` — binary Parquet I/O via pure TS (complex)
- `plotting` — Vega/Canvas-based charting (complex)

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 29 — 2026-04-04 16:55 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23983178519)

- **Status**: ✅ Accepted
- **Change**: `src/core/to_datetime.ts` + `src/core/to_timedelta.ts` — re-implemented lost iters 26–28. `to_datetime()` supports ISO 8601, custom strptime format (10 directives incl. %Y/%m/%d/%H/%I/%M/%S/%f/%p/%y), numeric units (s/ms/us/ns), Date passthrough, errors='raise'/'coerce'/'ignore', utc/tz/name. `to_timedelta()` + `TimedeltaIndex` with vectorised accessors, sum/mean/min/max, sort_values, add/sub, strformat. Playground page to_datetime.html added.
- **Metric**: 38 (previous committed best: 36, delta: +2 vs actual remote baseline) · **Commit**: ca425ed
- **Notes**: Branch `autoloop/build-tsb-pandas-typescript-migration-to-datetime-29`. PR creation tool continues to fail with "no commits found" — changes committed but PR not auto-created. Biome clean (0 errors), tsc 0 errors on new files. `useDefaultSwitchClause` requires `default:` in all switch statements; `noExcessiveCognitiveComplexity` ≤15 required extracting `onParseError` + `parseStringVal` helpers from `coerceOne`.

### Iteration 28 — 2026-04-04 16:10 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23982568406)

- **Status**: ✅ Accepted
- **Change**: `src/core/to_datetime.ts` + `src/core/to_timedelta.ts` — re-implemented lost iterations 26 & 27 (iters 26/27 branches were never pushed to remote). `to_datetime()` (ISO 8601 / numeric units / strptime / parseDatetime / errors modes), `to_timedelta()` (pandas-style / ISO 8601 / unit-style / numeric / TimedeltaIndex with aggregations + sort + arithmetic + strformat). Full tests and playground pages.
- **Metric**: 38 (previous committed best: 36 on datetime-tz-25 branch; state had 37 from lost iter 27, delta: +1 vs lost state / +2 vs actual committed) · **Commit**: 5695b49
- **Notes**: Iters 26/27 branches were never pushed (create_pull_request tool failure left them without a remote), so re-implemented both features cleanly. Biome complexity checks enforced: extracted helpers for ISO duration calc, strptime state mutation, and slash-date parsing. Metric now 38.

### Iteration 27 — 2026-04-04 15:44 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23982120680)

- **Status**: ✅ Accepted (branch lost — not pushed to remote; re-implemented in Iter 28)
- **Change**: `src/core/to_timedelta.ts` — to_timedelta() + TimedeltaIndex
- **Metric**: 37 (branch lost) · **Commit**: c80c718 (local only)

### Iterations 19–27 (summary)
- Iter 27 ✅ to_timedelta/TimedeltaIndex (37, branch lost) · Iter 26 ✅ to_datetime/strptime (37, branch lost) · Iter 25 ✅ DatetimeIndex/date_range (36)
- Iter 24 ✅ CategoricalIndex (35) · Iter 23 ✅ IntervalIndex (34) · Iter 22 ✅ Timedelta (33) · Iter 21 ✅ MultiIndex (32)
- Iter 20 ✅ Categorical/CategoricalDtype/CategoricalAccessor/factorize (31) · Iter 19 ✅ stats: describe/corr/cov/skew/kurtosis (30)

### Iterations 1–18 (summary)
- Iter 18 ✅ I/O: readCsv/readJson/toCsv/toJson (26) · Iter 17 ✅ window: rolling/expanding/ewm (22) · Iter 16 ✅ reshape: pivot/melt/stack (19)
- Iter 15 ✅ compare.ts (16) · Iter 14 ✅ indexing.ts (15) · Iter 13 ✅ sort.ts (14)
- Iter 12 ✅ datetime.ts (13) · Iter 11 ✅ missing.ts (12) · Iter 10 ✅ merge (11) · Iter 9 ✅ strings.ts (10)
- Iter 8 ✅ ops.ts (9) · Iter 7 ✅ concat (8) · Iter 6 ✅ GroupBy (7) · Iter 5 ✅ DataFrame (6) · Iter 4 ⚠️ Error · Iter 3 ✅ Dtype+Series (5) · Iter 2 ✅ Index+Dtype (4) · Iter 1 ✅ Foundation (1)
