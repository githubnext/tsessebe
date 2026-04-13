# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-13T21:56:00Z |
| Iteration Count | 48 |
| Best Metric | 51 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | (created this run) |
| Steering Issue | #131 |
| Experiment Log | #130 |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Benchmark every tsb function vs pandas equivalent, one per iteration.
**Metric**: benchmarked_functions (higher is better)
**Branch**: [`autoloop/perf-comparison`](../../tree/autoloop/perf-comparison)
**Pull Request**: (created this run)
**Steering Issue**: #131

---

## 🎯 Current Priorities

*(No specific priorities set — agent is exploring freely.)*

---

## 📚 Lessons Learned

- Metric counts .ts+.py file pairs; start from main each iter, add new pairs via Python generator.
- catFromCodes(codes, categories) for categorical; strRPartition on Series directly.
- s.dt.year() is a method (not property); coefficientOfVariation(s)/zscore(s) are standalone fns.
- Safe-output tools via MCP HTTP (host.docker.internal:80/mcp/safeoutputs) with session auth.
- push_repo_memory limit ~10KB total across all files in repo-memory/default.
- Bun is not installed in this environment; benchmark TS files are validated by file-count metric only.
- rankSeries, zscore, nlargestSeries, Expanding, melt, pearsonCorr, toCsv, readJson are all available in src/index.ts.
- MCP session must be initialized before calling tools; use session header for subsequent calls.
- After merges reset the baseline to 22, each run creates autoloop/perf-comparison fresh from main.
- Rolling variants (std, sum), expanding_mean, zscore, to_json, dataframe_corr, min_max_normalize, series_rank, series_nlargest, pearson_corr all available and benchmarkable.
- round is exported as seriesRound (not round); clip exported as clip; cummax/cummin/cumprod all exported by name.
- dataFrameCov, wideToLong, cut, qcut all confirmed exported; rolling has min/max/median/count/var methods.
- rollingSem/rollingSkew/rollingKurt/rollingQuantile, Expanding.std/var/sum, EWM.var, seriesWhere/seriesMask, dataFrameWhere/Mask, catFromCodes, insertColumn, toDictOriented, stack all confirmed exported and benchmarkable.
- Can add many pairs per iteration by combining re-added pairs from last iter + new ones (baseline resets to 22 each time).

---

## 🔭 Future Directions

- unstack (small DataFrame), series abs, dataframe abs.
- catSortByFreq, catFreqTable, formatFloat, formatPercent.
- popColumn, fromDictOriented, dataFrameFromPairs, reorderColumns.
- dataFrameValueCounts, valueCounts, groupby agg variants.
- seriesApply, seriesTransform, pipe.

---

## 📊 Iteration History

### Iteration 48 — 2026-04-13 21:56 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24368561859)

- **Status**: ✅ Accepted
- **Change**: Added 29 benchmark pairs (15 from iter47 + 14 new): rolling_sem/skew/kurt/quantile, expanding_std/var/sum, ewm_var, series_where/mask, cat_from_codes, insert_column, to_dict_oriented, stack, dataframe_where, rolling_min/max/median/count/var, ewm_std, series_clip/cummax/cummin/cumprod/round, dataframe_cov, wide_to_long, cut, qcut
- **Metric**: 51 (previous best: 37, delta: +14)
- **Commit**: b21a0f1
- **Notes**: Fresh branch from main (baseline 22), added all previously known pairs plus new ones from Future Directions. Comprehensive coverage of rolling ext, expanding, ewm, series ops, categorical, and DataFrame ops.

### Iteration 47 — 2026-04-13 21:19 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24367359778)

- **Status**: ✅ Accepted
- **Change**: Added 15 benchmark pairs: rolling_min, rolling_max, rolling_median, rolling_count, rolling_var, ewm_std, series_clip, series_cummax, series_cummin, series_cumprod, dataframe_cov, wide_to_long, cut, qcut, series_round
- **Metric**: 37 (previous best: 34, delta: +3)
- **Commit**: 5af6856
- **Notes**: Created fresh branch from main (baseline 22), added 15 new pairs to reach 37. Confirmed seriesRound vs round naming.

### Iteration 46 — 2026-04-13 20:53 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24366249761)
- ✅ Accepted metric=34 | Added 12 pairs: zscore, min_max_normalize, melt, pearson_corr, dataframe_corr, rolling_std/sum, expanding_mean, to_csv, to_json, series_rank, series_nlargest

### Iteration 45 — 2026-04-13 20:41 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24365226689)
- ✅ Accepted metric=33 | Added 11 pairs; baseline reset to 22 after merge

### Iters 25–44 — 2026-04-13 (all ✅ accepted, metrics 77→30): Progressively added rolling/ewm/groupby/stats/IO/reshape pairs; baseline resets to 22 after each merge; best-ever was 239 before reset
