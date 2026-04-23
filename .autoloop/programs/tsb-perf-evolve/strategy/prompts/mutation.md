# Mutation prompt — tsb-perf-evolve

You are about to apply a **single-parent operator** — either exploitation (refine an elite) or exploration (try something new in an under-represented island). This file frames how to reason about that change. Use it together with `strategy/alphaevolve.md`.

## What this operator is for

- **Exploitation** — you have a parent that works well. Make a *small, principled* change that you have a clear reason to believe will improve fitness. One change at a time. If you change five things at once and fitness moves, you will not know which thing did it.
- **Exploration** — you are seeding diversity in an island that is under-represented (or has never been tried). It is fine — desirable, even — to produce a candidate with worse fitness than the current best, as long as it lands in a *different feature cell*. Diversity has value.

## Mutation vocabulary

These are the moves available for `Series.sortValues`. They map roughly onto the islands enumerated in the playbook, but any move is legal in any island as long as the resulting candidate still belongs there.

- **Replace boxed pairs with parallel typed arrays**: instead of `[{v, i}, …]`, allocate a `Float64Array` for values and a `Uint32Array` for indices, sort one by reference to the other.
- **Indirect index sort**: sort a `Uint32Array` of indices `0..n-1` using a comparator that reads the source values; gather output at the end. Avoids touching the value array during the comparator.
- **Pack into a single typed array**: encode `(value, index)` into one `BigInt64Array` cell or two adjacent `Float64Array` cells; sort a single contiguous buffer.
- **Hoist NaN handling**: pre-partition NaN to the start or end (depending on `naPosition`) and sort only the finite slice. Eliminates a NaN check from the comparator.
- **Comparator monomorphization**: extract the comparator into a small monomorphic function so Bun's JIT can inline it. Avoid closing over `ascending`/`naPosition` — pass via dispatch to one of four pre-defined comparators.
- **Dtype dispatch**: branch on `this.dtype` before sorting, picking a specialized path per dtype (numeric → typed-array; string → string-comparator; object → boxed-pair fallback).
- **Radix / counting sort for finite floats**: transform `Float64` to a sortable `Uint32`/`BigUint64` representation (flip sign bit + flip negatives), LSD radix sort, untransform on gather.
- **Small-input fast path**: if `n < threshold` (e.g. 64), use the existing implementation; the typed-array overhead doesn't pay below that.
- **Preallocate output buffers**: avoid `Array.prototype.map` for the gather step; preallocate the output array(s) with `new Array(n)` or a typed array of the right size.
- **Avoid `Index.take` allocation**: if the index is a default `RangeIndex`, materialize directly without going through `take`; only call `take` for non-trivial indexes.

For **exploitation**, prefer small moves from the top of this list. For **exploration**, prefer larger structural moves from further down — or invent something not on the list and add it for future iterations.

## Domain knowledge

Things to keep in mind about this specific problem:

- Bun's JIT inlines monomorphic function calls aggressively — keep the comparator and the gather function call sites monomorphic. Avoid passing comparators that close over varying booleans; prefer dispatching to one of four pre-defined comparators.
- `Array.prototype.sort` in V8/JSC uses TimSort and is *very* good. Beating it requires either (a) avoiding the per-element object allocation, or (b) escaping comparison sort entirely (radix on transformed floats).
- Typed arrays bypass the JS GC, but allocating one inside a hot loop still costs. Allocate once, outside the measured region. (The benchmark runs `sortValues` `MEASURED_ITERATIONS` times — every per-call allocation matters.)
- The current implementation allocates `n` boxed `{v, i}` objects, then `n` more arrays for `pairs.map(...)` × 2, then a new Series. The allocation pressure dominates at `n = 100_000`.
- pandas `sort_values` is NumPy `argsort` under the hood, with a C-implemented quicksort/mergesort and zero per-element JS-style allocation. To beat it, exploit something JS has but NumPy doesn't (e.g. monomorphic JIT inlining of small specialized comparators) or avoid comparison entirely.
- NaN handling is *not* free in the comparator. Branch-prediction-friendly patterns: sort the finite slice and prepend/append NaN, rather than testing for NaN in every comparison.
- `Float64Array.prototype.sort` puts NaNs at the *end* by IEEE-754 ordering, not at the *position* requested by `naPosition`. You will need to partition NaN before/after the typed-array sort.
- Avoid `eval` / `new Function` — codegen overhead dominates at the iteration counts we measure.

## Reasoning template

Before writing any code, fill in (in your visible reasoning):

1. **Operator**: exploitation or exploration. Why this one (you may have been forced into it by the deterministic overrides in the playbook — say so).
2. **Parent**: candidate id, island, fitness, one-line approach summary.
3. **The move**: which mutation from the vocabulary above (or a novel one you are inventing — describe it).
4. **Hypothesis**: why this should improve fitness. Be specific. "Should be faster" is not a hypothesis. "Removes one allocation per row in the inner loop, which dominates the profile at n=100k" is a hypothesis.
5. **Predicted feature cell**: which `(storage, algorithm)` cell will this candidate land in? If it's the same cell as an existing elite with worse fitness, you should already be at higher confidence than usual.
6. **Validity pre-check**: walk through the cheap invariants from the playbook (signature, no `any`, NaN handling, index alignment).

Only after all six are written should you start editing code.

## Anti-patterns

- ❌ **Multi-mutation**: changing several unrelated things in one candidate. Split into separate iterations.
- ❌ **Re-discovering**: proposing a candidate whose approach already exists in the population. Always check the population first.
- ❌ **Vague hypothesis**: "this looks cleaner" or "should be more efficient" with no mechanism. If you can't name the mechanism, you don't have a hypothesis.
- ❌ **Ignoring rejected lessons**: if a similar mutation was rejected in a recent iteration *and* the Lessons Learned says why, do not retry it without a new angle.
- ❌ **Breaking NaN semantics**: silently changing where NaN ends up because the typed-array sort path makes it convenient. NaN placement is part of the contract.
