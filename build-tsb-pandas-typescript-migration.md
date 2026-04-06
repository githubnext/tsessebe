# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-06T15:48:18Z |
| Iteration Count | 97 |
| Best Metric | 52 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration-c9103f2f32e44258` |
| PR | #54 |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

**Goal**: Build `tsb`, a complete TypeScript port of pandas, one feature at a time.
**Metric**: `pandas_features_ported` (higher is better)
**Branch**: `autoloop/build-tsb-pandas-typescript-migration-c9103f2f32e44258`
**Pull Request**: #54

---

## 🎯 Current Priorities

**Note**: The main branch was reset to 6 files (earlier branches were not merged). Iter 53 re-establishes the new long-running branch from main (6 files → 8). The branch history in the state file (iters 1–52) reflects previous diverged work.

Now at 52 files (iter 97). Next candidates:
- `src/io/read_excel.ts` — Excel file reader (XLSX parsing, zero-dep)
- `src/core/timestamp.ts` — pandas Timestamp class
- `src/stats/to_numeric.ts` — pd.to_numeric, coerce strings/mixed to numbers

---

## 📚 Lessons Learned

- **Iter 97 (json_normalize, 51→52)**: `jsonNormalize` uses recursive `flattenObject(obj, sep, maxLevel, prefix, depth)`. `getPath(obj, path[])` traverses nested keys. `normalizeWithPath` handles `recordPath` + meta extraction. Meta values from parent record are replicated to each child row. `toPathArray` normalizes `string | readonly string[]` paths. Arrays at leaf positions are JSON-stringified. Column insertion order is first-seen (union across all rows). Missing columns in any row get `null`. `rows ??= []` handles the edge case after chained intermediate path extraction.
- **Iter 96 (wide_to_long, 50→51)**: `wideToLong` uses per-stub precompiled regexes (`buildStubRegex`). `escapeRegex` guards against special chars in stub/sep. Suffix ordering is first-seen from left-to-right column scan. Missing stub×suffix combinations fill with `null`. `parseSuffix` returns `number` for purely numeric suffixes (`/^-?\d+(\.\d+)?$/`), else `string`. The `j` conflict check allows `j === stubname` (stub overwritten) but rejects clashes with unrelated existing columns.
- **Iter 95 (crosstab, 49→50)**: `crosstab` uses same `scalarKey()` pattern as `factorize` for stable Map keys. `collectUniques()` preserves first-seen order (matches pandas). `buckets` for values+aggfunc uses `Array.from<number[]|undefined>({length}, () => undefined)` for clean typing (avoids `fill(undefined)` `any[]` issue). Normalization applied before margins so margin totals reflect raw counts. Property tests: sum of all cells = n, normalize='all' grand sum ≈ 1, normalize='index' all row sums ≈ 1, normalize='columns' all col sums ≈ 1, margins All column = row sum.
- **Iter 94 (factorize, 48→49)**: `factorize` uses stable string key (`typeof v:String(v)`) to handle null/undefined/NaN separately. `useNaSentinel=true` assigns -1 to missing values. `sort=true` remaps via sorted array. Property tests: valid indices, no duplicate uniques, round-trip, sorted order.
- **Iter 93 (get_dummies, 47→48)**: `getDummies` collects unique non-missing values in first-seen order. Missing → 0 by default; `dummyNa: true` adds "NaN" column. `dropFirst` removes first category. `dataFrameGetDummies` uses column name as default prefix.
- **Iter 92 (datetime_tz, 46→47)**: `utcOffsetMs` uses `Intl.DateTimeFormat formatToParts` + two-step refinement for DST. `% 24` handles rare "24:00" midnight. Property tests: UTC round-trip, tz_convert preserves ms.
- **Iter 91 (add_sub_mul_div, 45→46)**: Commutative ops (add/mul) radd/rmul delegate to forward form. rsub/rdiv reverse operand order. Property tests use `fc.integer` to avoid float precision issues.
- **Iter 90 (pow_mod, 44→45)**: `_mod` uses `a - Math.floor(a/b)*b` to avoid overflow. `Math.floor(0/negative) = -0`; normalize with `r===0 ? 0 : r`. Property tests use integer inputs.
- **Iter 89 (numeric_ops, 43→44)**: Use `fc.double` (not `fc.float`). Exclude infinities from `sign(n)*abs(n)≈n` property test.
- **Iter 88 (DatetimeIndex/date_range/bdate_range, 42→43)**: `freqToOffset(freq, n)` takes multiplier. `negateOffset()` dispatches on `offset.name`.
- **Iter 87 (DateOffset, 41→42)**: 11 offset classes. Anchored use `Date.UTC(y, m+n+1, 0)` trick. UTC throughout.
- **Iter 86 (Timedelta/TimedeltaIndex, 40→41)**: Internal ms; `floorDiv` helper. `biome-ignore lint/style/noNonNullAssertion:` for bounds-checked access.
- **Iter 85 (Period/PeriodIndex, 39→40)**: Ordinal-based. Top-level regex. `default: throw` for exhaustiveness.
- **Iters 73–84**: fillna, interpolate, shift/diff, compare, where/mask, cut/qcut, interval, sample, apply, CategoricalIndex, pipe, DateOffset. Top-level regex. `extractName()` returns `string | null`. Barrel imports.
- **Iters 53–72**: GroupBy, merge, str, dt, describe, csv, json, corr, rolling, expanding, ewm, melt, pivot, stack/unstack, value_counts, elem_ops, cum_ops, nlargest, rank, MultiIndex.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

**Current state (iter 97)**: 52 files — Series, DataFrame, GroupBy, concat, merge, str/dt/cat accessors, stats/describe, io/csv, io/json, io/json_normalize, stats/corr, window/rolling, window/expanding, window/ewm, reshape/melt, reshape/pivot, reshape/stack_unstack, reshape/wide_to_long, MultiIndex, stats/rank, stats/nlargest, stats/cum_ops, stats/elem_ops, stats/value_counts, stats/where_mask, stats/compare, stats/shift_diff, stats/interpolate, stats/fillna, core/interval, stats/cut, stats/sample, stats/apply, core/categorical_index, stats/pipe, core/period, core/timedelta, core/date_offset, core/date_range, stats/numeric_ops, stats/pow_mod, stats/add_sub_mul_div, core/datetime_tz, stats/get_dummies, stats/factorize, stats/crosstab.

**Next**: io/read_excel (XLSX zero-dep) · core/pd_timestamp (pandas Timestamp class) · stats/to_numeric (coerce mixed types to numbers)

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 97 — 2026-04-06 15:48 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24038653649)

- **Status**: ✅ Accepted
- **Change**: Added `src/io/json_normalize.ts` — `jsonNormalize(data, options?)` to flatten nested JSON to a flat DataFrame, mirroring `pandas.json_normalize()`.
- **Metric**: 52 (previous: 51, delta: +1)
- **Commit**: c74a398
- **Notes**: Recursive `flattenObject` with `maxLevel` depth guard. `recordPath` drills into nested arrays; `meta` replicates parent fields to each child row. Arrays at leaf positions stringify to JSON. 35+ unit + 4 property tests. Full playground page.

### Iteration 96 — 2026-04-06 15:19 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24037601583)

- **Status**: ✅ Accepted
- **Change**: Added `src/reshape/wide_to_long.ts` — `wideToLong(df, stubnames, i, j, options?)` for stub-based wide-to-long reshape mirroring `pandas.wide_to_long()`.
- **Metric**: 51 (previous: 50, delta: +1)
- **Commit**: a9a1db5
- **Notes**: Groups related stub columns (A1, A2, B1, B2 → stubs A, B) into long format with j column for suffixes. Supports sep, custom suffix regex, regex-safe escaping, null-fill for missing combos. 30+ unit + 4 property tests.

### Iters 92–95 — ✅ datetime_tz (46→47), get_dummies (47→48), factorize (48→49), crosstab (49→50)
### Iters 87–91 — ✅ DateOffset (41→42), date_range/DatetimeIndex (42→43), numeric_ops (43→44), pow_mod (44→45), add_sub_mul_div (45→46)
### Iters 73–86 — ✅ where_mask, compare, shift_diff, interpolate, fillna, Interval, cut/qcut, sample, apply, CategoricalIndex, pipe, Period, Timedelta, DateOffset (28→41)
### Iters 67–72 — ✅ value_counts, elem_ops, cum_ops, nlargest, rank, MultiIndex (22→28)
### Iters 60–66 — ✅ corr/cov, rolling, expanding×2, cat_accessor, melt+pivot, ewm, stack/unstack (15→22)
### Iterations 53–59 — ✅ GroupBy, merge, str, dt, describe/quantile, csv I/O, json I/O (8→14)
### Iterations 1–52 — ✅ Foundation + earlier pandas features (old branches)
