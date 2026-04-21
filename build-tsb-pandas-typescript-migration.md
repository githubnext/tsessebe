# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-21T19:30:25Z |
| Iteration Count | 232 |
| Best Metric | 108 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #174 |
| Steering Issue | #107 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, error, accepted, error, error, error, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Build tsb — a complete TypeScript port of pandas, one feature at a time.
**Metric**: pandas_features_ported (higher is better)
**Branch**: [`autoloop/build-tsb-pandas-typescript-migration`](../../tree/autoloop/build-tsb-pandas-typescript-migration)
**Pull Request**: #174 | **Steering Issue**: #107

---

## 🎯 Current Priorities

- `core/str_accessor` improvements (findall, extractall)
- `io/to_json_normalize.ts` — inverse of jsonNormalize
- More groupby operations (transform, filter, apply)

---

## 📚 Lessons Learned

- **Biome**: `useBlockStatements --write --unsafe`. `Number.NaN`/`Number.POSITIVE_INFINITY`. Default import fc. `import type` for value-unused imports.
- **TypeScript**: `(value as unknown) instanceof X` for instanceof-passthrough. `as Scalar`/`as number` for noUncheckedIndexedAccess. `readonly T[]` not `ReadonlyArray<T>`. Extract helpers for ≤15 complexity.
- **Tests**: Import from `../../src/index.ts`. `Series<Scalar>` type. `Series({dtype: Dtype, name: null|string})`.
- **MCP safeoutputs**: session flow: init → notifications/initialized → tools/call with Mcp-Session-Id. Accept: application/json, text/event-stream. `push_to_pull_request_branch` (not create) when PR exists.
- **Regex**: Global regex requires `lastIndex=0` reset before reuse in loops.
- **Iter 232**: Consolidated two Timedelta classes into one (core). RE_PANDAS now accepts 'N days' without time. Added backward-compat aliases (totalMs, scale, subtract, lt, gt, eq, sign, ms). Always use `Timedelta.fromMilliseconds(ms)` not `new Timedelta(ms)` (constructor is private). Metric: 108.
- **Iter 230**: date_range: D/B/h/min/s/ms/W/W-DOW/MS/ME/QS/QE/YS/YE, inclusive, normalize, UNIT_NORM table. Complexity ≤15 via helpers. Metric: 61.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

- `stats/timedelta_range.ts` — pd.timedelta_range()
- `core/str_accessor` — findall, extractall, normalize
- `io/to_json_normalize.ts` — nested records from flat DataFrame

---

## 📊 Iteration History

### Iter 232 — 2026-04-21 19:30 UTC — ✅ Consolidate Timedelta, fix timedelta_range parsing. Metric: 108. Commit: 7ae0fce. [Run](https://github.com/githubnext/tsessebe/actions/runs/24742152636)
### Iter 231 — 2026-04-21 — ✅ +timedelta_range. Metric: 108. Commit: 532569e.
### Iter 230 — 2026-04-12 11:15 UTC — ✅ +date_range. Metric: 61. Commit: 996705d. [Run](https://github.com/githubnext/tsessebe/actions/runs/24305375139)
### Iter 229 — 2026-04-12 10:47 UTC — ✅ +to_timedelta (after 5 push failures). Metric: 60. Commit: 48a486c.
### Iters 224–228 — ⚠️ Push failures (MCP policy). to_timedelta + to_datetime code written but not pushed. to_datetime IS on remote at 716a7f3/480c452.
### Iters 53–223 — ✅/⚠️ (metrics 8→58): nancumops(58), to_numeric(57), quantile(56), sem_var+nunique(55), mode+skew_kurt(53), jsonNormalize(51), readExcel(50), and many more features.
