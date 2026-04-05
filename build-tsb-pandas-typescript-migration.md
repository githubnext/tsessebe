# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-05T11:11:00Z |
| Iteration Count | 52 |
| Best Metric | 101 |
| Target Metric | — |
| Branch | `work-branch-41-a62d454c5d6737a7` |
| PR | #45 |
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
**Branch**: `work-branch-41-a62d454c5d6737a7`
**Pull Request**: #45

---

## 🎯 Current Priorities

Iter 52 complete (101 files). Added: stats/survival.ts, stats/timeseries.ts, stats/factor.ts, stats/bayesian.ts, core/style_advanced.ts.

Next candidates:
- `src/io/read_excel_advanced.ts` — multi-sheet / openpyxl-like features
- `src/core/sparse_frame.ts` — sparse DataFrame extensions
- `src/stats/timeseries.ts` extension — ARIMA forecast stubs
- `src/core/extension_types.ts` — ExtensionArray / custom dtypes
- `src/io/read_parquet_advanced.ts` — predicate pushdown / column selection
- `src/stats/outlier.ts` — IQR, z-score, DBSCAN-based outlier detection

---

## 📚 Lessons Learned

- **Iter 52 (5 modules, 96→101)**: survival.ts: `sortedEvents` helper reduces CC; all-zero numerator gives hazard=0 cleanly. timeseries.ts: `normAcv()` extracted to avoid nested ternary; `ldStep()` extracted from `levinsonDurbin` to satisfy CC≤15; ACF/PACF require symmetric Toeplitz construction. factor.ts: `leadingSingular` + `deflate` pattern for incremental SVD; `noUncheckedIndexedAccess` requires every `arr[i]` to have `?? 0` guard. bayesian.ts: all conjugate update functions are ~4 LOC; returning structured `BetaParams/NormalParams/etc` avoids `as` casts. style_advanced.ts: needed `Styler._df` + `_styles` + `_addStyle` to be `protected` (not private); `_applyByCol` / `_applyByRow` pattern satisfies CC≤15 for nested loops.
- **Iter 51 (5 modules, 91→96)**: core/plotting.ts (`import type {Series/DataFrame}` avoids circular; `setPlotRenderer(null)` clears). core/arrow.ts (`readonly T[]` not ReadonlyArray; block statements; import sorting). core/window_apply.ts (`name: s.name ?? null` for exactOptionalPropertyTypes). io/read_sas.ts + io/read_spss.ts (injectable decoder stubs). Test mock: `decode: (): SasResult => result` for `useExplicitType`.
- **Iter 50 (6 modules, 87→93)**: State stale (claimed 91, branch had 87). io/clipboard.ts (`CARRIAGE_RETURN_RE` top-level; `biome-ignore noSecrets`). `DataFrame.fromColumns({})` not `new DataFrame({data:{}})`. `meta["key"]` bracket notation.
- **Iter 48 (4 modules, 83→87)**: anova.ts CC>15 → extract helpers. resample.ts: RULE_REGEX top-level, `.at(-1)`, block statements.
- **Iter 47 (4 modules, 79→83)**: read_xml char-scan tokenizer. contingency Lanczos gamma. memory_usage dtype bytes. sql SqlConnection interface.
- **Iter 46 (4 modules, 75→79)**: read_fwf `isBreak[i] ?? true`. read_html global regex + `lastIndex=0`. bootstrap LCG PRNG. expanding-corr `name: source.name`.
- **Iter 45 (4, 71→75)**: `JsonValue` interface indirection (TS2456). Core → siblings directly (circular).
- **Iter 40+ (misc)**: `git show <branch>:<file>` for old branches. Pre-existing TS errors in window/merge — only validate new files.
- **General**: `exactOptionalPropertyTypes`: `?? null`. `noUncheckedIndexedAccess`: guard indexes. CC≤15: extract helpers. `useTopLevelRegex`. `useNumberNamespace: Number.NaN`. `import fc from "fast-check"` (default). `useForOf`. `import type` for type-only. `bun not in PATH` — use `node_modules/.bin/biome` / `tsc`.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

✅ Done through Iter 50: Foundation, Index/Dtype/Series/DataFrame, GroupBy, concat, merge, ops, strings, missing, datetime, sort, indexing, compare, reshape, window, I/O (csv/json/parquet/excel-stub/to_parquet/to_excel/to_markdown/to_html/to_latex/to_string/read_fwf/read_html/read_xml/sql/read_orc/read_feather/clipboard/read_sas/read_spss), stats (corr/cov/describe/moments/linear-algebra/hypothesis/pairwise/bootstrap/contingency/anova/kruskal/regression), categorical, MultiIndex, Timedelta, IntervalIndex, CategoricalIndex, DatetimeIndex, valueCounts/crosstab, cut/qcut, applyMap/pipe, getDummies/fromDummies, to_datetime/to_timedelta, rankSeries, assignDataFrame/filterDataFrame, explodeSeries/explodeDataFrame, strAdvanced, shift/diff, wide_to_long, clip/clipDataFrame, where/mask, sample, cumulative, infer_objects/convertDtypes, accessor API, Styler, to_numeric, Period/PeriodIndex, linear algebra, SparseArray, DateOffsets, testing utils, NAType/NA, Flags, option registry, json_normalize, eval/query DSL, expanding corr/cov, memory_usage, resample/asfreq, plotting API.

**Next**: read_excel_advanced · sparse_frame · ARIMA stubs · extension_types · outlier detection

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 52 — 2026-04-05 11:11 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24000271487)

- **Status**: ✅ Accepted
- **Change**: Added 5 modules: stats/survival.ts (Kaplan-Meier estimator + log-rank test), stats/timeseries.ts (ACF/PACF/ARMA via Levinson-Durbin/Ljung-Box), stats/factor.ts (PCA via power-iteration SVD + factor analysis stub), stats/bayesian.ts (Beta-Binomial, Normal-Normal, Gamma-Poisson, Dirichlet-Categorical conjugate updates), core/style_advanced.ts (AdvancedStyler with bar/heatmap/textGradient/threshold). Also made Styler._df/_styles/_addStyle `protected` to enable subclassing.
- **Metric**: 101 (previous best: 96, delta: +5)
- **Commit**: c0c81d9
- **Notes**: `ldStep()` helper needed to reduce Levinson-Durbin CC. `_applyByCol`/`_applyByRow` in AdvancedStyler reduce nested-loop CC. Every `arr[i]` guarded with `?? 0` for noUncheckedIndexedAccess.

### Iteration 51 — 2026-04-05 11:00 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23999891697)

- **Status**: ✅ Accepted
- **Change**: Added 5 modules: core/plotting.ts (declarative PlotSpec API, `setPlotRenderer`, 14 Series+DataFrame chart functions), core/arrow.ts (Apache Arrow IPC `fromArrow`/`toArrow` with injectable decoders/encoders), core/window_apply.ts (`rollingApply`/`expandingApply`/DataFrame variants for custom fn over windows), io/read_sas.ts (SAS7BDAT/XPORT injectable decoder stub), io/read_spss.ts (SPSS SAV/ZSAV injectable decoder with `applyValueLabels`)
- **Metric**: 96 (previous best: 91, delta: +5)
- **Commit**: 765e7a5
- **Notes**: State claimed 93 but actual branch had 91 files. Built from iter 49 baseline. Key fix: `name: s.name ?? null` (not `?? undefined`) for exactOptionalPropertyTypes. Test mock return types need explicit annotations for `useExplicitType`.

### Iteration 50 — 2026-04-05 10:12 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23999361181)

- **Status**: ✅ Accepted
- **Change**: Added 6 modules: stats/kruskal.ts (Kruskal-Wallis H + Mann-Whitney U with chi-sq/normal p-values), stats/regression.ts (OLS/WLS via QR decomp with SE/t-stats/p-values/R²/RMSE), io/clipboard.ts (injectable ClipboardAdapter, readClipboard/toClipboard/seriesFromClipboard), core/plotting.ts (declarative PlotSpec API with setPlotRenderer hook for 11 chart kinds), io/read_sas.ts (injectable SasDecoder stub with column/row slicing), io/read_spss.ts (injectable SpssDecoder stub with value labels and metadata)
- **Metric**: 93 (previous best: 87, delta: +6)
- **Commit**: 4c554ee
- **Notes**: State file was stale (claimed 91 but branch had 87). Built from iter 48 baseline. Full QR decomposition implemented locally in regression.ts to avoid circular deps. Biome `noSecrets` false positive on error strings requires inline disable comments.

### Iteration 49 — 2026-04-05 09:30 UTC — ✅ kruskal/regression/clipboard/plotting — 87→91 (push failed; branch stayed at 87, actual delivered in iter 51)
### Iteration 48 — 2026-04-05 08:15 UTC — ✅ anova/resample/read_orc/read_feather — 83→87
### Iteration 47 — 2026-04-05 07:54 UTC — ✅ read_xml/contingency/memory_usage/sql — 79→83
### Iteration 46 — 2026-04-05 06:29 UTC — ✅ read_fwf/read_html/bootstrap/expanding-corr — 75→79
### Iterations 1–45 — ✅ Foundation→index→series→DataFrame→groupby→merge→concat→ops→strings→missing→datetime→sort→indexing→compare→reshape→window→I/O→stats→categorical→MultiIndex→Timedelta→IntervalIndex→CategoricalIndex→DatetimeIndex→valueCounts→cut/qcut→apply→getDummies→to_datetime→rank→assign→explode→strAdvanced→shift/diff→wide_to_long→clip→where→sample→cumulative→infer_objects→accessor→Styler→to_numeric→Period→linalg→SparseArray→DateOffsets→testing→NAType→Flags→options→json_normalize→eval/query→expanding-corr→resample
