# tsb-perf-evolve — code/

This directory holds the **fixed inputs** for the program: the benchmark scripts and a small config. The autoloop iterations should rarely touch these files. The thing that *evolves* is `src/core/series.ts` (specifically the `sortValues` method) — see `../program.md` for the full picture.

## Files

- `config.yaml` — tunables read by the AlphaEvolve playbook (`exploitation_ratio`, `num_islands`, `population_size`, `archive_size`, dataset size).
- `benchmark.ts` — tsb-side benchmark. Builds a Series of `dataset_size` random floats with ~5% NaN, calls `sortValues` in a tight loop, prints `{"function": "Series.sortValues", "mean_ms": …, "iterations": …, "total_ms": …}`.
- `benchmark.py` — pandas-side benchmark. Builds an equivalent `pd.Series`, calls `.sort_values()` in the same loop structure, prints the same JSON shape.

The two benchmarks must stay aligned: same dataset size, same NaN ratio, same warm-up + measured iteration counts. If you tweak one, tweak the other.
