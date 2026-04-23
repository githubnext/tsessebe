# Mutation prompt — <CUSTOMIZE: program-name>

You are about to apply a **single-parent operator** — either exploitation (refine an elite) or exploration (try something new in an under-represented island). This file frames how to reason about that change. Use it together with `strategy/alphaevolve.md`.

## What this operator is for

- **Exploitation** — you have a parent that works well. Make a *small, principled* change that you have a clear reason to believe will improve fitness. One change at a time. If you change five things at once and fitness moves, you will not know which thing did it.
- **Exploration** — you are seeding diversity in an island that is under-represented (or has never been tried). It is fine — desirable, even — to produce a candidate with worse fitness than the current best, as long as it lands in a *different feature cell*. Diversity has value.

## Mutation vocabulary

These are the moves available for this problem (<CUSTOMIZE: rewrite this list with 5–10 problem-specific mutations>):

- <CUSTOMIZE: e.g. "Replace `Array.prototype.map` over a numeric column with a preallocated `Float64Array` + indexed loop.">
- <CUSTOMIZE: e.g. "Hoist a repeated lookup out of a hot loop and cache it in a local.">
- <CUSTOMIZE: e.g. "Swap a comparison-based sort for a counting / radix sort when the dtype permits.">
- <CUSTOMIZE: e.g. "Inline a small helper to remove a call frame in the inner loop.">
- <CUSTOMIZE: e.g. "Convert AoS to SoA for the working set.">
- <CUSTOMIZE: e.g. "Batch operations across columns into a single pass.">
- <CUSTOMIZE: e.g. "Swap a `Map` for a plain `Object` (or vice versa) for hot lookups.">

For **exploitation**, prefer small moves from the top of this list. For **exploration**, prefer larger structural moves from further down — or invent something not on the list and add it for future iterations.

## Domain knowledge

Things you, the agent, should keep in mind about this specific problem (<CUSTOMIZE: replace with 5–20 short bullets — performance characteristics of the runtime, known fast paths, common pitfalls, etc.>):

- <CUSTOMIZE: e.g. "Bun's JIT inlines monomorphic function calls aggressively — keep call sites monomorphic.">
- <CUSTOMIZE: e.g. "Typed arrays bypass the JS GC. Allocating one inside a hot loop still costs — preallocate and reuse.">
- <CUSTOMIZE: e.g. "pandas vectorized ops are mostly NumPy under the hood. To beat them, exploit knowledge JS has but NumPy doesn't (e.g. branch-prediction-friendly layouts).">
- <CUSTOMIZE: e.g. "If you find yourself reaching for `eval` or `new Function`, stop — the codegen overhead dominates for small inputs.">

## Reasoning template

Before writing any code, fill in (in your visible reasoning):

1. **Operator**: exploitation or exploration. Why this one (you may have been forced into it by the deterministic overrides in the playbook — say so).
2. **Parent**: candidate id, island, fitness, one-line approach summary.
3. **The move**: which mutation from the vocabulary above (or a novel one you are inventing — describe it).
4. **Hypothesis**: why this should improve fitness. Be specific. "Should be faster" is not a hypothesis. "Removes one allocation per row in the inner loop, which dominates the profile at n=100k" is a hypothesis.
5. **Predicted feature cell**: which `(dim1, dim2)` cell will this candidate land in? If it's the same cell as an existing elite with worse fitness, you should already be at higher confidence than usual.
6. **Validity pre-check**: walk through the cheap invariants from the playbook.

Only after all six are written should you start editing code.

## Anti-patterns

- ❌ **Multi-mutation**: changing several unrelated things in one candidate. Split into separate iterations.
- ❌ **Re-discovering**: proposing a candidate whose approach already exists in the population. Always check the population first.
- ❌ **Vague hypothesis**: "this looks cleaner" or "should be more efficient" with no mechanism. If you can't name the mechanism, you don't have a hypothesis.
- ❌ **Ignoring rejected lessons**: if a similar mutation was rejected in a recent iteration *and* the Lessons Learned says why, do not retry it without a new angle.
