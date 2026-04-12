# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-12T00:30:00Z |
| Iteration Count | 216 |
| Best Metric | 51 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | — |
| Steering Issue | #107 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Build tsb — a complete TypeScript port of pandas, one feature at a time.
**Metric**: pandas_features_ported (higher is better)
**Branch**: [`autoloop/build-tsb-pandas-typescript-migration`](../../tree/autoloop/build-tsb-pandas-typescript-migration)
**Pull Request**: TBD (to be created for `autoloop/build-tsb-pandas-typescript-migration`)
**Steering Issue**: #107
**Experiment Log**: #3

---

## 🎯 Current Priorities

Next features to implement (prioritized by impact):
- `stats/describe_categorical.ts` — extend describe() for categorical/string Series
- `core/str_accessor` improvements or new string ops
- `window/ewm` improvements

---

## 📚 Lessons Learned

- **Iter 216**: `jsonNormalize` — `io/json_normalize.ts`. Flatten nested JSON objects into DataFrames. `isJsonPrimitive` type guard for safe narrowing of `JsonValue` after `!isJsonObject && !Array.isArray` checks (avoids `as` casts). `navigatePath`: TypeScript narrows `cur` to `JsonObject` after `if (!isJsonObject(cur)) return null` guard, so `cur[key]` works without cast. `Array.isArray(data)` on `JsonObject | readonly JsonObject[]` gives `any[]`, assignable to `readonly JsonObject[]`. Helper decomposition: `flattenObject`, `flattenTopLevel`, `flattenRecordRows`, `buildMetaRecord`, `extractRecords`, `prefixRecord`, `primitiveOrStringify`, `navigatePath`. `DataFrame.fromRecords(flatRows)` works without cast (`Record<string,Scalar>[]` → `readonly Readonly<Record<string,Scalar>>[]` is covariant). Metric: 51 (+1). Commit: b26b44c.
- **Iter 215**: `readExcel`/`xlsxSheetNames` — `io/read_excel.ts`. Full XLSX reader from scratch: ZIP binary parser (EOCD + central directory + local headers), DEFLATE via `node:zlib` `inflateRawSync` (biome-ignore noNodejsModules). XML parsing via `regexAll` generator (avoids `noAssignInExpressions`). `noExcessiveCognitiveComplexity`: extract `extractHeaderLabels`, `pivotToColumns`, `padHeaderLabels` helpers from `buildColumnarData`. `useNumberNamespace`: use `Number.parseInt`, `Number.isNaN`. Function signature `Uint8Array | ArrayBufferLike` (not `ArrayBuffer`) to accept `.buffer` property without casts. Property tests: use `fc.uniqueArray` to avoid duplicate headers causing shape mismatch. Metric: 50 (+1). Commit: 5748b07.
- **Iter 214**: `selectDtypes` — `stats/select_dtypes.ts`. Use `import type` for DataFrame (it's only used as a type). Extract `validateNoOverlap` and `columnPasses` helpers to keep complexity under 15. `useExplicitLengthCheck`: use `(x?.length ?? 0) > 0` pattern for optional arrays. `fc.constantFrom<DtypeSpecifier>(...)` type param needed for property tests. Auto-format with `bunx biome format --write` to fix formatter diffs. Metric: 49 (+1). Commit: edf0fb4.
- **Iter 213**: `interpolate` — `stats/interpolate.ts`. Extract helpers (`fillLinearRun`, `classifyAreas`, `bisectLeft`, `chooseNearest`) to stay under complexity limit. `classifyAreas` precomputes inside/outside area for each position cleanly. Use `as Scalar`/`as number`/`as string` casts for `noUncheckedIndexedAccess` — same pattern as `na_ops.ts` uses `out[i] as Scalar`. `isMissing()` helper reuse pattern. `interpolateByColumns`/`interpolateByRows` extracted to reduce main function complexity. Metric: 48 (+1). Commit: ab037f6.
- **Iter 212**: `factorize` + `wide_to_long` — Two features in one iteration to recover from iter 211's lost push. `noExcessiveCognitiveComplexity`: extract `collectUniques`, `buildCodes`, `compareLabels` helpers for factorize; extract `discoverSuffixMap`, `buildStubSourceData`, `accumulateRow` helpers for wideToLong. `useBlockStatements`: always use braces. `noNestedTernary`: use if/else chains. `useSimplifiedLogicExpression`: `!(a || b)` form. `useTopLevelRegex`: move `/^\d+$/` to module top-level. Metric: 47 (+1). Commit: 5b782a6.
- **Iter 211**: `factorize`/`factorizeSeries` — `stats/factorize.ts`. With `noUncheckedIndexedAccess: true`, use `for (const [i, v] of values.entries())` instead of `values[i]` in a for loop to avoid `Scalar | undefined`. `codeMap.get(v) ?? naValue` handles the `undefined` case from Map.get. `rawUniques as readonly Label[]` cast is necessary since `Scalar` is wider than `Label` — same pattern used in crosstab.ts. Metric: 46 (+1). Commit: 620ff7a.
- **Iter 210**: `explode` — `reshape/explode.ts`. For `Array.isArray(value)` where `value: Scalar` (Scalar has no array members), TypeScript narrows to `never` in the truthy branch. Fix: widen to `unknown` first (`const raw: unknown = value`), then `Array.isArray(raw)` narrows to `unknown[]`. Use `arr.map(c => (c ?? null) as Scalar)` for element extraction. `typeof column === "string"` is cleaner than `Array.isArray` for `string | readonly string[]` union. `DataFrame.fromColumns` accepts `Record<string, Scalar[]>` directly (no `as` cast to readonly needed). Metric: 45 (+1). Commit: 6434a78.
- **Iter 209**: `pivotTableFull` — `noSecrets` flags sentinel strings (use biome-ignore). `useAtIndex` → `.at(-1)`. `useShorthandArrayType`: `T[]`. `useSimplifiedLogicExpression`: `!(a || b)`. Metric: 44 (+1). Commit: 0932ce7.
- **Iter 208**: `crosstab` — `noExcessiveCognitiveComplexity` (max 15): split normalize/sum helpers. Use `create_pull_request` when canonical branch doesn't exist remotely. Metric: 43 (+1). Commit: 1ab2e7c.
- **Iter 206**: `getDummies`/`fromDummies` — fix complexity by extracting helpers. Import `Dtype` from `../core/index.ts`. Metric: 42 (+1). Commit: f5a69ab.
- **Iter 205**: `Interval`/`IntervalIndex`/`intervalRange` — import tests from `../../src/index.ts`. Canonical branch may not exist remotely — re-create from hash-suffix. Metric: 41 (+1).
- **Iter 204**: `cut`/`qcut` — decompose `assignBins` for complexity. `useCollapsedElseIf`. `as unknown as [T, U]` for overload narrowing. Metric: 40 (+1).
- **Iter 203**: Canonical branch `autoloop/build-tsb-pandas-typescript-migration` created from hash-suffix branch (iter 199 state, 37 files). Re-implemented `clip_advanced.ts` (lost from iter 200) and `apply.ts` (lost from iter 201). Biome `noExcessiveCognitiveComplexity` → decompose into axis helpers. `noUselessElse` → remove else after early returns. Metric: 39 (from 37, delta: +2).
- **Iter 202**: `clipAdvancedSeries`/`clipAdvancedDataFrame` — canonical branch created from main. Fixed missing exports in src/index.ts, stats/index.ts, core/index.ts for modules from iters 172–199. `noNestedTernary` → use if/else for axis resolution. `ReadonlyArray<T>` → `readonly T[]` for Biome. Metric: 38 (from 37; also fixed index wiring).
- **Iter 199**: `sampleSeries`/`sampleDataFrame` — Import `Scalar` from `../../src/index.ts` (not `../../src/types.ts`) in tests to satisfy `useImportRestrictions`.
- **DataFrame API**: `df.columns.values` is `readonly string[]`. `df.index.size` (not `.length`). Use `DataFrame.fromColumns()` factory.
- **Series options**: `dtype` must be a `Dtype` object; `name` accepts `string | null` (not `undefined`).
- **Biome**: `useBlockStatements` auto-fixable with `--write --unsafe`. `Number.NaN`, `Number.POSITIVE_INFINITY` required. Use `import fc from "fast-check"` (default import).
- **Tests**: Import from `../../src/index.ts`. Type Series params as `Series<Scalar>`.
- **MCP**: Use direct HTTP to `http://host.docker.internal:80/mcp/safeoutputs` with session-ID handshake. `push_to_pull_request_branch` requires local branch named exactly as remote tracking branch.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

- `stats/describe_categorical.ts` — extend describe() for categorical/string Series
- `io/to_json_normalize.ts` — inverse of jsonNormalize (nested records from flat DataFrame)
- `core/str_accessor` — more string methods on Series

---

## 📊 Iteration History

### Iteration 216 — 2026-04-12 00:30 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24294949963)
- **Status**: ✅ Accepted — Add `io/json_normalize.ts`: jsonNormalize(data, options?) — flatten nested JSON to DataFrame. recordPath, meta, metaPrefix, recordPrefix, sep, maxLevel, errors options. 26 tests (unit + fast-check property tests). Playground: json_normalize.html. Metric: 51 (+1). Commit: b26b44c.

### Iteration 215 — 2026-04-11 23:30 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24294236300)
- **Status**: ✅ Accepted — Add `io/read_excel.ts`: readExcel(data, options?) + xlsxSheetNames(data). ZIP binary parser + DEFLATE + XML regex parsing. header/skipRows/nrows/naValues/indexCol/sheetName options. 26 tests. Metric: 50 (+1). Commit: 5748b07.

### Iteration 214 — 2026-04-11 22:55 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24293279696)
- **Status**: ✅ Accepted — Add `stats/select_dtypes.ts`: selectDtypes(df, {include, exclude}). Generic aliases: number/integer/signed/unsigned/floating/bool/string/datetime/timedelta/category/object. Metric: 49 (+1). Commit: edf0fb4.

### Iteration 213 — 2026-04-11 22:23 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24292676836)
- **Status**: ✅ Accepted — Add `stats/interpolate.ts`: interpolateSeries/interpolateDataFrame. linear/pad/bfill/nearest; limit, limitDirection, limitArea; axis=0/1 for DataFrame. Metric: 48 (+1). Commit: ab037f6.

### Iters 205–212 — 2026-04-11 — ✅ (metrics 41→47)
- 205: Interval/IntervalIndex/intervalRange. 206: getDummies/fromDummies. 207–208: crosstab. 209: pivotTableFull. 210: explode. 211: factorize. 212: factorize+wide_to_long.

### Iters 199–204 — 2026-04-11 — ✅ (metrics 36→40)
- 199: sample. 200–201: clip_advanced, apply (lost on push). 202: fix exports + clip_advanced. 203: re-impl apply+clip. 204: cut/qcut.

### Iters 172–198 — 2026-04-10/11 — ✅ (metrics 29→36)
- 172: na_ops. 173–192: push failures. 193: idxmin_idxmax (MCP fixed). 194–198: astype, replace, where_mask, diff_shift, duplicated.

### Iters 53–171 — ✅/⚠️ (metrics 8→29: feature implementations and recoveries)
