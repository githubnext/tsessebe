/**
 * eval_query — `DataFrame.query()` and `DataFrame.eval()`.
 *
 * Mirrors `pandas.DataFrame.query(expr)` and `pandas.DataFrame.eval(expr)`:
 *
 * - {@link queryDataFrame} — filter rows using a boolean expression string
 * - {@link evalDataFrame}  — evaluate an expression, returning a new `Series`
 *
 * Supported expression syntax:
 * - **Column references**: bare identifiers (`col`) or backtick-quoted (`` `col name` ``)
 * - **Literals**: `42`, `3.14`, `"foo"`, `'bar'`, `True`/`False`, `None`/`null`/`NaN`
 * - **Arithmetic**: `+  -  *  /  %  **`  (standard precedence)
 * - **Comparison**: `==  !=  <  <=  >  >=`
 * - **Logical**: `and  or  not`
 * - **Membership**: `col in [1, 2, 3]`, `col not in ("a", "b")`
 * - **Functions**: `abs(x)`, `round(x, d)`, `str(x)`, `len(x)`, `lower(x)`,
 *                  `upper(x)`, `isnull(x)` / `isna(x)`, `notnull(x)` / `notna(x)`
 * - **Grouping**: parentheses
 *
 * @example
 * ```ts
 * import { DataFrame, queryDataFrame, evalDataFrame } from "tsb";
 *
 * const df = DataFrame.fromArrays({ a: [1, 2, 3, 4], b: ["x", "y", "x", "y"] });
 *
 * // Filter rows
 * queryDataFrame(df, "a > 2 and b == 'x'");
 * // DataFrame with row: a=3, b="x"
 *
 * // Evaluate expression
 * evalDataFrame(df, "a * 2");
 * // Series [2, 4, 6, 8]
 * ```
 *
 * @module
 */

import type { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── Token types ──────────────────────────────────────────────────────────────

type TokKind =
  | "NUM"
  | "STR"
  | "IDENT"
  | "BACKTICK"
  | "EQ"
  | "NEQ"
  | "LT"
  | "LE"
  | "GT"
  | "GE"
  | "PLUS"
  | "MINUS"
  | "STAR"
  | "SLASH"
  | "PERCENT"
  | "POW"
  | "LPAREN"
  | "RPAREN"
  | "LBRACKET"
  | "RBRACKET"
  | "COMMA"
  | "EOF";

interface Token {
  readonly kind: TokKind;
  readonly value: string;
  readonly pos: number;
}

// ─── Lexer ────────────────────────────────────────────────────────────────────

/** Tokenise an expression string into a flat token array. */
function lex(expr: string): readonly Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    i = lexOne(expr, i, tokens);
  }
  tokens.push({ kind: "EOF", value: "", pos: expr.length });
  return tokens;
}

/** Lex one token starting at position `i`; return new position. */
function lexOne(expr: string, i: number, out: Token[]): number {
  const ch = expr.charAt(i);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
    return i + 1;
  }
  if (ch === "`") {
    return lexBacktick(expr, i, out);
  }
  if (ch === '"' || ch === "'") {
    return lexString(expr, i, out);
  }
  if (ch >= "0" && ch <= "9") {
    return lexNumber(expr, i, out);
  }
  if (ch === "." && isDigit(expr.charAt(i + 1))) {
    return lexNumber(expr, i, out);
  }
  if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || ch === "_") {
    return lexIdent(expr, i, out);
  }
  return lexSymbol(expr, i, out);
}

function isDigit(ch: string): boolean {
  return ch >= "0" && ch <= "9";
}

function lexBacktick(expr: string, i: number, out: Token[]): number {
  const start = i + 1;
  let j = start;
  while (j < expr.length && expr.charAt(j) !== "`") {
    j++;
  }
  out.push({ kind: "BACKTICK", value: expr.slice(start, j), pos: i });
  return j + 1;
}

function lexString(expr: string, i: number, out: Token[]): number {
  const q = expr.charAt(i);
  let j = i + 1;
  let result = "";
  while (j < expr.length && expr.charAt(j) !== q) {
    if (expr.charAt(j) === "\\") {
      j++;
      result += expr.charAt(j);
    } else {
      result += expr.charAt(j);
    }
    j++;
  }
  out.push({ kind: "STR", value: result, pos: i });
  return j + 1;
}

function lexNumber(expr: string, i: number, out: Token[]): number {
  let pos = i;
  const start = pos;
  while (pos < expr.length) {
    const c = expr.charAt(pos);
    if (!((c >= "0" && c <= "9") || c === ".")) {
      break;
    }
    pos++;
  }
  if (pos < expr.length && (expr.charAt(pos) === "e" || expr.charAt(pos) === "E")) {
    pos++;
    const sign = expr.charAt(pos);
    if (sign === "+" || sign === "-") {
      pos++;
    }
    while (pos < expr.length && isDigit(expr.charAt(pos))) {
      pos++;
    }
  }
  out.push({ kind: "NUM", value: expr.slice(start, pos), pos: start });
  return pos;
}

function lexIdent(expr: string, i: number, out: Token[]): number {
  let pos = i;
  const start = pos;
  while (pos < expr.length && /\w/.test(expr.charAt(pos))) {
    pos++;
  }
  out.push({ kind: "IDENT", value: expr.slice(start, pos), pos: start });
  return pos;
}

const SINGLE_CHAR_TOKENS: ReadonlyMap<string, TokKind> = new Map<string, TokKind>([
  ["<", "LT"],
  [">", "GT"],
  ["+", "PLUS"],
  ["-", "MINUS"],
  ["*", "STAR"],
  ["/", "SLASH"],
  ["%", "PERCENT"],
  ["(", "LPAREN"],
  [")", "RPAREN"],
  ["[", "LBRACKET"],
  ["]", "RBRACKET"],
  [",", "COMMA"],
]);

function lexSymbol(expr: string, i: number, out: Token[]): number {
  const ch = expr.charAt(i);
  const ch2 = expr.charAt(i + 1);
  if (ch === "=" && ch2 === "=") {
    out.push({ kind: "EQ", value: "==", pos: i });
    return i + 2;
  }
  if (ch === "!" && ch2 === "=") {
    out.push({ kind: "NEQ", value: "!=", pos: i });
    return i + 2;
  }
  if (ch === "<" && ch2 === "=") {
    out.push({ kind: "LE", value: "<=", pos: i });
    return i + 2;
  }
  if (ch === ">" && ch2 === "=") {
    out.push({ kind: "GE", value: ">=", pos: i });
    return i + 2;
  }
  if (ch === "*" && ch2 === "*") {
    out.push({ kind: "POW", value: "**", pos: i });
    return i + 2;
  }
  const kind = SINGLE_CHAR_TOKENS.get(ch);
  if (kind !== undefined) {
    out.push({ kind, value: ch, pos: i });
    return i + 1;
  }
  throw new SyntaxError(`Unexpected character '${ch}' at position ${i} in: ${expr}`);
}

// ─── AST ──────────────────────────────────────────────────────────────────────

type AstNode =
  | { readonly type: "BinOp"; readonly op: string; readonly left: AstNode; readonly right: AstNode }
  | { readonly type: "UnaryOp"; readonly op: string; readonly operand: AstNode }
  | {
      readonly type: "InOp";
      readonly value: AstNode;
      readonly list: readonly AstNode[];
      readonly negated: boolean;
    }
  | { readonly type: "Literal"; readonly value: Scalar }
  | { readonly type: "ColRef"; readonly name: string }
  | { readonly type: "FuncCall"; readonly name: string; readonly args: readonly AstNode[] };

// ─── Parser ───────────────────────────────────────────────────────────────────

class ExprParser {
  private readonly tokens: readonly Token[];
  private pos = 0;

  constructor(tokens: readonly Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.pos] ?? { kind: "EOF", value: "", pos: 0 };
  }

  private peek2(): Token {
    return this.tokens[this.pos + 1] ?? { kind: "EOF", value: "", pos: 0 };
  }

  private consume(): Token {
    const t = this.peek();
    this.pos++;
    return t;
  }

  private expect(kind: TokKind): Token {
    const t = this.consume();
    if (t.kind !== kind) {
      throw new SyntaxError(`Expected ${kind} but got ${t.kind} ('${t.value}')`);
    }
    return t;
  }

  private matchKw(word: string): boolean {
    const t = this.peek();
    return t.kind === "IDENT" && t.value.toLowerCase() === word;
  }

  /** Parse and consume the full expression, asserting EOF. */
  parse(): AstNode {
    const node = this.parseOr();
    if (this.peek().kind !== "EOF") {
      throw new SyntaxError(`Unexpected token '${this.peek().value}' after expression`);
    }
    return node;
  }

  private parseOr(): AstNode {
    let left = this.parseAnd();
    while (this.matchKw("or")) {
      this.consume();
      const right = this.parseAnd();
      left = { type: "BinOp", op: "or", left, right };
    }
    return left;
  }

  private parseAnd(): AstNode {
    let left = this.parseNot();
    while (this.matchKw("and")) {
      this.consume();
      const right = this.parseNot();
      left = { type: "BinOp", op: "and", left, right };
    }
    return left;
  }

  private parseNot(): AstNode {
    if (this.matchKw("not")) {
      this.consume();
      return { type: "UnaryOp", op: "not", operand: this.parseNot() };
    }
    return this.parseComparison();
  }

  private parseComparison(): AstNode {
    const left = this.parseAdd();
    return this.parseCmpRhs(left);
  }

  private parseCmpRhs(left: AstNode): AstNode {
    const CMP_KINDS: readonly TokKind[] = ["EQ", "NEQ", "LT", "LE", "GT", "GE"];
    if (
      this.matchKw("not") &&
      this.peek2().kind === "IDENT" &&
      this.peek2().value.toLowerCase() === "in"
    ) {
      this.consume(); // "not"
      this.consume(); // "in"
      return { type: "InOp", value: left, list: this.parseListLiteral(), negated: true };
    }
    if (this.matchKw("in")) {
      this.consume(); // "in"
      return { type: "InOp", value: left, list: this.parseListLiteral(), negated: false };
    }
    if (!CMP_KINDS.includes(this.peek().kind)) {
      return left;
    }
    const op = this.consume().value;
    const right = this.parseAdd();
    return { type: "BinOp", op, left, right };
  }

  private parseListLiteral(): readonly AstNode[] {
    const items: AstNode[] = [];
    const open = this.peek().kind;
    if (open !== "LPAREN" && open !== "LBRACKET") {
      items.push(this.parsePrimary());
      return items;
    }
    this.consume();
    const close: TokKind = open === "LPAREN" ? "RPAREN" : "RBRACKET";
    while (this.peek().kind !== close && this.peek().kind !== "EOF") {
      items.push(this.parsePrimary());
      if (this.peek().kind === "COMMA") {
        this.consume();
      }
    }
    this.expect(close);
    return items;
  }

  private parseAdd(): AstNode {
    let left = this.parseMul();
    while (this.peek().kind === "PLUS" || this.peek().kind === "MINUS") {
      const op = this.consume().value;
      const right = this.parseMul();
      left = { type: "BinOp", op, left, right };
    }
    return left;
  }

  private parseMul(): AstNode {
    let left = this.parseUnary();
    while (
      this.peek().kind === "STAR" ||
      this.peek().kind === "SLASH" ||
      this.peek().kind === "PERCENT"
    ) {
      const op = this.consume().value;
      const right = this.parseUnary();
      left = { type: "BinOp", op, left, right };
    }
    return left;
  }

  private parseUnary(): AstNode {
    if (this.peek().kind === "MINUS") {
      this.consume();
      return { type: "UnaryOp", op: "-", operand: this.parseUnary() };
    }
    if (this.peek().kind === "PLUS") {
      this.consume();
      return this.parseUnary();
    }
    return this.parsePow();
  }

  private parsePow(): AstNode {
    const base = this.parsePrimary();
    if (this.peek().kind === "POW") {
      this.consume();
      const exp = this.parseUnary();
      return { type: "BinOp", op: "**", left: base, right: exp };
    }
    return base;
  }

  private parsePrimary(): AstNode {
    const t = this.peek();
    if (t.kind === "LPAREN") {
      return this.parseParenExpr();
    }
    if (t.kind === "BACKTICK") {
      this.consume();
      return { type: "ColRef", name: t.value };
    }
    if (t.kind === "NUM") {
      this.consume();
      return { type: "Literal", value: Number(t.value) };
    }
    if (t.kind === "STR") {
      this.consume();
      return { type: "Literal", value: t.value };
    }
    if (t.kind === "IDENT") {
      return this.parseIdentOrCall();
    }
    throw new SyntaxError(`Unexpected token '${t.value}' at position ${t.pos}`);
  }

  private parseParenExpr(): AstNode {
    this.consume(); // "("
    const node = this.parseOr();
    this.expect("RPAREN");
    return node;
  }

  private parseIdentOrCall(): AstNode {
    const t = this.consume();
    const low = t.value.toLowerCase();
    if (low === "true") {
      return { type: "Literal", value: true };
    }
    if (low === "false") {
      return { type: "Literal", value: false };
    }
    if (low === "none" || low === "null" || low === "nan") {
      return { type: "Literal", value: null };
    }
    if (this.peek().kind === "LPAREN") {
      this.consume(); // "("
      const args = this.parseFuncArgs();
      this.expect("RPAREN");
      return { type: "FuncCall", name: t.value, args };
    }
    return { type: "ColRef", name: t.value };
  }

  private parseFuncArgs(): readonly AstNode[] {
    const args: AstNode[] = [];
    while (this.peek().kind !== "RPAREN" && this.peek().kind !== "EOF") {
      args.push(this.parseOr());
      if (this.peek().kind === "COMMA") {
        this.consume();
      }
    }
    return args;
  }
}

// ─── Evaluator ────────────────────────────────────────────────────────────────

/** Evaluate an AST node for one row, given column values in `row`. */
function evalNode(node: AstNode, row: ReadonlyMap<string, Scalar>): Scalar {
  switch (node.type) {
    case "Literal":
      return node.value;
    case "ColRef": {
      if (!row.has(node.name)) {
        throw new Error(`Column '${node.name}' not found in DataFrame`);
      }
      return row.get(node.name) ?? null;
    }
    case "UnaryOp":
      return evalUnary(node.op, evalNode(node.operand, row));
    case "BinOp":
      return evalBinOp(node.op, node.left, node.right, row);
    case "InOp":
      return evalInOp(node, row);
    case "FuncCall":
      return evalFuncCall(node.name, node.args, row);
  }
}

function isTruthy(v: Scalar): boolean {
  if (v === null || v === undefined) {
    return false;
  }
  if (typeof v === "boolean") {
    return v;
  }
  if (typeof v === "number") {
    return v !== 0 && !Number.isNaN(v);
  }
  if (typeof v === "string") {
    return v.length > 0;
  }
  if (typeof v === "bigint") {
    return v !== 0n;
  }
  return true;
}

function evalUnary(op: string, val: Scalar): Scalar {
  if (op === "-") {
    return typeof val === "number" ? -val : null;
  }
  if (op === "+") {
    return typeof val === "number" ? val : null;
  }
  if (op === "not") {
    return !isTruthy(val);
  }
  return null;
}

function evalBinOp(
  op: string,
  leftNode: AstNode,
  rightNode: AstNode,
  row: ReadonlyMap<string, Scalar>,
): Scalar {
  // Short-circuit logical ops
  if (op === "or") {
    return isTruthy(evalNode(leftNode, row)) ? true : isTruthy(evalNode(rightNode, row));
  }
  if (op === "and") {
    return isTruthy(evalNode(leftNode, row)) ? isTruthy(evalNode(rightNode, row)) : false;
  }
  return applyBinOp(op, evalNode(leftNode, row), evalNode(rightNode, row));
}

function scalarEq(l: Scalar, r: Scalar): boolean {
  if (l === null || l === undefined) {
    return r === null || r === undefined;
  }
  if (typeof l === "number" && Number.isNaN(l)) {
    return false;
  }
  if (l instanceof Date && r instanceof Date) {
    return l.getTime() === r.getTime();
  }
  return l === r;
}

function numericCmp(l: Scalar, r: Scalar): number {
  if (l == null || r == null) {
    return Number.NaN;
  }
  if (l instanceof Date && r instanceof Date) {
    return l.getTime() - r.getTime();
  }
  if (typeof l === "number" && typeof r === "number") {
    return l - r;
  }
  if (typeof l === "string" && typeof r === "string") {
    return l < r ? -1 : l > r ? 1 : 0;
  }
  return Number.NaN;
}

function numericOp(l: Scalar, r: Scalar, fn: (a: number, b: number) => number): Scalar {
  if (l == null || r == null) {
    return null;
  }
  if (typeof l === "number" && typeof r === "number") {
    return canonicalizeZero(fn(l, r));
  }
  return null;
}

function applyBinOp(op: string, l: Scalar, r: Scalar): Scalar {
  switch (op) {
    case "==":
      return scalarEq(l, r);
    case "!=":
      return !scalarEq(l, r);
    case "<":
      return numericCmp(l, r) < 0;
    case "<=":
      return numericCmp(l, r) <= 0;
    case ">":
      return numericCmp(l, r) > 0;
    case ">=":
      return numericCmp(l, r) >= 0;
    case "+":
      return addScalar(l, r);
    case "-":
      return numericOp(l, r, (a, b) => a - b);
    case "*":
      return numericOp(l, r, (a, b) => a * b);
    case "/":
      return numericOp(l, r, (a, b) => a / b);
    case "%":
      return numericOp(l, r, (a, b) => a % b);
    case "**":
      return numericOp(l, r, Math.pow);
    default:
      return null;
  }
}

function addScalar(l: Scalar, r: Scalar): Scalar {
  if (l == null || r == null) {
    return null;
  }
  if (typeof l === "string" || typeof r === "string") {
    return String(l) + String(r);
  }
  if (typeof l === "number" && typeof r === "number") {
    return canonicalizeZero(l + r);
  }
  return null;
}

function canonicalizeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

function evalInOp(
  node: Extract<AstNode, { type: "InOp" }>,
  row: ReadonlyMap<string, Scalar>,
): boolean {
  const val = evalNode(node.value, row);
  const found = node.list.some((item) => scalarEq(val, evalNode(item, row)));
  return node.negated ? !found : found;
}

type BuiltinFn = (args: readonly Scalar[]) => Scalar;

const BUILTIN_FUNCS: ReadonlyMap<string, BuiltinFn> = new Map<string, BuiltinFn>([
  [
    "abs",
    (a) => {
      const x = a[0];
      return typeof x === "number" ? Math.abs(x) : null;
    },
  ],
  [
    "round",
    (a) => {
      const x = a[0];
      const d = a[1];
      return typeof x === "number" ? Number(x.toFixed(typeof d === "number" ? d : 0)) : null;
    },
  ],
  [
    "str",
    (a) => {
      const x = a[0];
      return x == null ? null : String(x);
    },
  ],
  [
    "len",
    (a) => {
      const x = a[0];
      return typeof x === "string" ? x.length : null;
    },
  ],
  [
    "lower",
    (a) => {
      const x = a[0];
      return typeof x === "string" ? x.toLowerCase() : null;
    },
  ],
  [
    "upper",
    (a) => {
      const x = a[0];
      return typeof x === "string" ? x.toUpperCase() : null;
    },
  ],
  [
    "isnull",
    (a) => {
      const x = a[0];
      return x == null || (typeof x === "number" && Number.isNaN(x));
    },
  ],
  [
    "isna",
    (a) => {
      const x = a[0];
      return x == null || (typeof x === "number" && Number.isNaN(x));
    },
  ],
  [
    "notnull",
    (a) => {
      const x = a[0];
      return x != null && !(typeof x === "number" && Number.isNaN(x));
    },
  ],
  [
    "notna",
    (a) => {
      const x = a[0];
      return x != null && !(typeof x === "number" && Number.isNaN(x));
    },
  ],
  [
    "sqrt",
    (a) => {
      const x = a[0];
      return typeof x === "number" ? Math.sqrt(x) : null;
    },
  ],
  [
    "log",
    (a) => {
      const x = a[0];
      return typeof x === "number" ? Math.log(x) : null;
    },
  ],
  [
    "log2",
    (a) => {
      const x = a[0];
      return typeof x === "number" ? Math.log2(x) : null;
    },
  ],
  [
    "log10",
    (a) => {
      const x = a[0];
      return typeof x === "number" ? Math.log10(x) : null;
    },
  ],
  [
    "floor",
    (a) => {
      const x = a[0];
      return typeof x === "number" ? Math.floor(x) : null;
    },
  ],
  [
    "ceil",
    (a) => {
      const x = a[0];
      return typeof x === "number" ? Math.ceil(x) : null;
    },
  ],
]);

function evalFuncCall(
  name: string,
  argNodes: readonly AstNode[],
  row: ReadonlyMap<string, Scalar>,
): Scalar {
  const fn = BUILTIN_FUNCS.get(name.toLowerCase());
  if (fn === undefined) {
    throw new Error(`Unknown function '${name}()'`);
  }
  return fn(argNodes.map((a) => evalNode(a, row)));
}

// ─── Row accessor ─────────────────────────────────────────────────────────────

function buildRowMap(df: DataFrame, rowIdx: number): ReadonlyMap<string, Scalar> {
  const map = new Map<string, Scalar>();
  for (const col of df.columns.values) {
    map.set(col, df.col(col).iat(rowIdx));
  }
  return map;
}

// ─── Public functions ─────────────────────────────────────────────────────────

/**
 * Filter rows of a DataFrame using a boolean expression string.
 *
 * Mirrors `pandas.DataFrame.query(expr)`.
 *
 * Column names with spaces or special characters can be quoted with backticks:
 * `` `column name` == "value" ``.
 *
 * @param df   - The input DataFrame.
 * @param expr - Boolean expression string referencing column names.
 * @returns    A new DataFrame containing only the rows where `expr` is truthy.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromArrays({ a: [1, 2, 3, 4], score: [0.1, 0.9, 0.5, 0.8] });
 * queryDataFrame(df, "a >= 2 and score > 0.7");
 * // a=2,score=0.9 | a=4,score=0.8
 * ```
 */
export function queryDataFrame(df: DataFrame, expr: string): DataFrame {
  const tokens = lex(expr);
  const ast = new ExprParser(tokens).parse();
  const nRows = df.shape[0];
  const keep: number[] = [];
  for (let i = 0; i < nRows; i++) {
    if (isTruthy(evalNode(ast, buildRowMap(df, i)))) {
      keep.push(i);
    }
  }
  return df.iloc(keep);
}

/**
 * Evaluate an expression against a DataFrame, returning a new Series.
 *
 * Mirrors `pandas.DataFrame.eval(expr)`.
 *
 * @param df   - The input DataFrame.
 * @param expr - Expression string referencing column names.
 * @returns    A `Series<Scalar>` with one value per row.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromArrays({ price: [10, 20, 30], qty: [2, 3, 1] });
 * evalDataFrame(df, "price * qty");
 * // Series [20, 60, 30]
 * ```
 */
export function evalDataFrame(df: DataFrame, expr: string): Series<Scalar> {
  const tokens = lex(expr);
  const ast = new ExprParser(tokens).parse();
  const nRows = df.shape[0];
  const results: Scalar[] = new Array(nRows);
  for (let i = 0; i < nRows; i++) {
    results[i] = evalNode(ast, buildRowMap(df, i));
  }
  return new Series<Scalar>({ data: results, index: df.index });
}
