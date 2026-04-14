/**
 * natsort — natural-order sorting for strings and string-keyed collections.
 *
 * Mirrors the behaviour of the Python `natsort` package used by pandas when
 * calling `Index.sort_values(key=natsort_keygen())` or `natsorted(...)`.
 *
 * The algorithm tokenises each string into alternating *text* and *digit*
 * chunks and compares them chunk-by-chunk:
 * - Digit chunks are compared **numerically** (so "file10" > "file9").
 * - Text chunks are compared **lexicographically** (optionally case-folded).
 *
 * @module
 */

// ─── types ────────────────────────────────────────────────────────────────────

/** A single token produced by the tokeniser: a string run or a non-negative integer. */
type Token = string | number;

/** Options shared by all public `nat*` helpers. */
export interface NatSortOptions {
  /**
   * If `true`, fold text tokens to lower-case before comparing.
   * Digit tokens are always compared numerically regardless of this flag.
   * @defaultValue `false`
   */
  readonly ignoreCase?: boolean;

  /**
   * If `true`, reverse the comparison direction so that `natSorted` returns
   * values in descending natural order.
   * @defaultValue `false`
   */
  readonly reverse?: boolean;
}

/** Options for {@link natSorted} that additionally allow a key function. */
export interface NatSortedOptions<T> extends NatSortOptions {
  /**
   * Optional function that extracts the string to sort by from each element.
   * When omitted, elements must themselves be strings.
   */
  readonly key?: (item: T) => string;
}

// ─── internal helpers ─────────────────────────────────────────────────────────

/**
 * Split `s` into a sequence of alternating text and digit tokens.
 *
 * Examples:
 * - `"file10.txt"` → `["file", 10, ".txt"]`
 * - `"abc"` → `["abc"]`
 * - `"007"` → `[7]`
 */
function tokenize(s: string): readonly Token[] {
  const tokens: Token[] = [];
  // Split on runs of ASCII digits
  const re = /(\d+)/g;
  let last = 0;
  while (true) {
    const m = re.exec(s);
    if (m === null) {
      break;
    }
    if (m.index > last) {
      tokens.push(s.slice(last, m.index));
    }
    tokens.push(Number(m[0]));
    last = m.index + m[0].length;
  }
  if (last < s.length) {
    tokens.push(s.slice(last));
  }
  return tokens;
}

/**
 * Compare two individual tokens.
 *
 * Mixed-type comparison (one text, one digit) always places the digit chunk
 * *before* the text chunk — matching `natsort`'s default `ns.DEFAULT` order.
 */
function cmpTokens(a: Token, b: Token, ignoreCase: boolean): number {
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }
  if (typeof a === "string" && typeof b === "string") {
    const la = ignoreCase ? a.toLowerCase() : a;
    const lb = ignoreCase ? b.toLowerCase() : b;
    return la < lb ? -1 : la > lb ? 1 : 0;
  }
  // Mixed: digit tokens sort before string tokens
  return typeof a === "number" ? -1 : 1;
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Natural-order comparator suitable for use as an argument to `Array.sort`.
 *
 * ```ts
 * const files = ["file10.txt", "file2.txt", "file1.txt"];
 * files.sort(natCompare);
 * // → ["file1.txt", "file2.txt", "file10.txt"]
 * ```
 *
 * Mirrors `natsort.natsort_keygen()` used inside pandas.
 *
 * @param a - First string to compare.
 * @param b - Second string to compare.
 * @param options - Sort options (ignoreCase, reverse).
 * @returns Negative, zero, or positive number as expected by `Array.sort`.
 */
export function natCompare(a: string, b: string, options: NatSortOptions = {}): number {
  const { ignoreCase = false, reverse = false } = options;
  const ta = tokenize(a);
  const tb = tokenize(b);
  const len = Math.min(ta.length, tb.length);
  for (let i = 0; i < len; i++) {
    const taToken = ta[i];
    const tbToken = tb[i];
    if (taToken === undefined || tbToken === undefined) {
      break;
    }
    const c = cmpTokens(taToken, tbToken, ignoreCase);
    if (c !== 0) {
      return reverse ? -c : c;
    }
  }
  const lenCmp = ta.length - tb.length;
  if (lenCmp === 0) {
    return 0;
  }
  return reverse ? -lenCmp : lenCmp;
}

/**
 * Return a new array sorted in natural order.
 *
 * ```ts
 * natSorted(["b1", "a20", "a3"])
 * // → ["a3", "a20", "b1"]
 * ```
 *
 * When elements are not strings, pass a `key` function that extracts the
 * string to sort by:
 *
 * ```ts
 * const rows = [{ name: "file10" }, { name: "file2" }];
 * natSorted(rows, { key: r => r.name });
 * // → [{ name: "file2" }, { name: "file10" }]
 * ```
 *
 * Mirrors `natsort.natsorted()`.
 *
 * @param arr - Array to sort (not mutated).
 * @param options - Sort options (ignoreCase, reverse, key).
 * @returns New array in natural order.
 */
export function natSorted<T>(arr: readonly T[], options: NatSortedOptions<T> = {}): T[] {
  const { key, ...cmpOpts } = options;
  const copy = [...arr];
  if (key !== undefined) {
    copy.sort((a, b) => natCompare(key(a), key(b), cmpOpts));
  } else {
    copy.sort((a, b) => {
      if (typeof a !== "string" || typeof b !== "string") {
        throw new TypeError(
          "natSorted: elements must be strings when no `key` function is provided",
        );
      }
      return natCompare(a, b, cmpOpts);
    });
  }
  return copy;
}

/**
 * Compute the natural-sort **key** for a string.
 *
 * Returns the token array that `natCompare` derives internally. Useful for
 * caching keys when sorting large arrays (compare once, sort many).
 *
 * ```ts
 * const key = natSortKey("file10.txt");
 * // → ["file", 10, ".txt"]
 * ```
 *
 * Mirrors `natsort.natsort_key()`.
 *
 * @param s - String to produce a key for.
 * @param options - Sort options (ignoreCase only; `reverse` is not applied to keys).
 * @returns Immutable token array.
 */
export function natSortKey(
  s: string,
  options: Pick<NatSortOptions, "ignoreCase"> = {},
): readonly Token[] {
  const { ignoreCase = false } = options;
  const tokens = tokenize(s);
  if (!ignoreCase) {
    return tokens;
  }
  return tokens.map((t) => (typeof t === "string" ? t.toLowerCase() : t));
}

/**
 * Return the integer permutation that would sort `arr` in natural order.
 *
 * ```ts
 * natArgSort(["file10", "file2", "file1"])
 * // → [2, 1, 0]  (index of "file1", "file2", "file10" in original array)
 * ```
 *
 * Mirrors the `argsort` / `natsort` integration in `pandas.Index`.
 *
 * @param arr - Array of strings to rank.
 * @param options - Sort options (ignoreCase, reverse).
 * @returns Array of original indices in sorted order.
 */
export function natArgSort(arr: readonly string[], options: NatSortOptions = {}): number[] {
  const indices = arr.map((_, i) => i);
  const { ignoreCase = false, reverse = false } = options;
  const keys = arr.map((s) => tokenize(ignoreCase ? s.toLowerCase() : s));
  indices.sort((i, j) => {
    const ta = keys[i];
    const tb = keys[j];
    if (ta === undefined || tb === undefined) {
      throw new RangeError("natArgSort: index out of bounds");
    }
    const len = Math.min(ta.length, tb.length);
    for (let k = 0; k < len; k++) {
      const taToken = ta[k];
      const tbToken = tb[k];
      if (taToken === undefined || tbToken === undefined) {
        break;
      }
      const c = cmpTokens(taToken, tbToken, false); // already case-folded
      if (c !== 0) {
        return reverse ? -c : c;
      }
    }
    const lc = ta.length - tb.length;
    if (lc === 0) {
      return 0;
    }
    return reverse ? -lc : lc;
  });
  return indices;
}
