# Crossover & Migration prompt — tsb-perf-evolve

You are about to apply a **two-parent operator** — either crossover (combine ideas from parents on different islands) or migration (graft a technique that works on one island into a solution on another). This file frames how to reason about that change. Use it together with `strategy/alphaevolve.md`.

## What these operators are for

- **Crossover** — both parents are valid, working candidates from different islands. The goal is a child that takes a *good idea* from each. Crossover that is just "average the two" almost never wins; structural composition does.
- **Migration** — one parent (the **donor**) is on island A, where some technique works particularly well. The other parent (the **recipient**) is on island B, where the technique has not been tried. The goal is to graft the technique from A into a candidate on B, *without* breaking what makes B's island distinctive.

The agent must be able to clearly say: "the *X* in this child came from parent A; the *Y* came from parent B."

## Combination patterns

How "combining" looks for `Series.sortValues`:

- **Storage × algorithm**: take parent A's storage layout (e.g. parallel typed arrays from the indirect-sort island) and parent B's algorithm (e.g. radix sort from the non-comparison island). Produces "radix sort over typed-array storage", which may live in a third island.
- **NaN handling × hot path**: take parent A's NaN pre-partition strategy (clean separation of finite and NaN slices) and parent B's hot-path code (whatever it does with the finite slice). Useful when parent A is slow but has clean NaN handling, and parent B is fast on finite data only.
- **Dispatch × kernel**: take parent A's dtype-dispatch (e.g. one path for `float64`, one for `string`, one for object) and parent B's per-dtype kernel for the dtype where parent B excels.
- **Small-input fast path × large-input core**: take parent A's small-input branch (often the boring boxed-pair sort, which is fastest at `n < 64`) and parent B's large-input core. Produces a hybrid that wins across the whole size range.
- **Comparator × indirection**: take parent A's monomorphic comparator and graft it into parent B's index-sort indirection scheme.

If none of the patterns above fits the two parents you've picked, that's a signal those parents are not a good crossover pair. Pick different parents — don't force a bad combination.

## Migration patterns

Worked examples for "porting a technique from island A to island B":

- **Typed-array gather → comparison-sort island**: the indirect-sort island uses a `Float64Array` to avoid the boxed-number tax. Port that allocation pattern into the comparison-sort island's gather step (after the boxed sort), keeping the boxed sort itself but materializing the output through a typed array.
- **Radix dtype-dispatch → hybrid island**: the radix island already dispatches on dtype to pick `Uint32Array` vs `Float64Array` paths. Port the dispatch into the hybrid island so the hybrid's large-input branch gets dtype-aware acceleration.
- **NaN pre-partition → typed-array island**: the comparison-sort island handles NaN inside the comparator. Port the *pre-partition* approach (separate finite from NaN once at the top) into the typed-array island, where it gives a much cleaner contiguous finite slice for `Float64Array.prototype.sort`.

## Reasoning template

Before writing any code, fill in (in your visible reasoning):

1. **Operator**: crossover or migration. Why this one (or were you forced into it by the deterministic overrides in the playbook).
2. **Parent A** (donor for migration): id, island, fitness, the *specific technique* you're taking.
3. **Parent B** (recipient for migration): id, island, fitness, what you're keeping.
4. **The graft**: which combination/migration pattern from above. Be precise about what comes from where.
5. **Hypothesis**: why the combined / grafted result should outperform either parent alone. The mechanism must reference *both* parents' contributions.
6. **Recipient island integrity**: for migration only — does the resulting candidate still belong to the recipient island, or has the graft pushed it into a third island? If it's now in a different island, that's fine — but record it accurately in the population entry.
7. **Predicted feature cell**: which `(storage, algorithm)` cell the child lands in. Crossovers often land in a *new* cell — that's a feature, not a bug.
8. **Validity pre-check**: walk through the cheap invariants from the playbook (signature, no `any`, NaN handling, index alignment). Pay extra attention here — grafts are the most common source of "compiles but breaks an invariant" candidates, especially around NaN placement.

Only after all eight are written should you start editing code.

## Anti-patterns

- ❌ **Naive average**: literally averaging two configs / two algorithms. Always loses to either parent.
- ❌ **Same-island crossover**: picking two parents on the same island. That's exploitation with extra steps.
- ❌ **Whole-parent swap**: producing a child that is identical to one of the parents (you "combined" by ignoring one). If you can't name a contribution from each parent, you haven't done crossover.
- ❌ **Migration that demolishes the recipient**: the graft replaces so much of the recipient that the result is just the donor on a different island label. The point of migration is to *enrich*, not overwrite.
- ❌ **Breaking NaN semantics on the seam**: the most common failure mode is the donor's storage and the recipient's NaN handling not agreeing on where NaN lives. Walk through one ascending+`naPosition: "first"` example by hand before committing.
