/**
 * Tests for readHtml() — pd.io.html port.
 */

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import { readHtml } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function simpleTable(headers: string[], rows: string[][]): string {
  const thRow = headers.map((h) => `<th>${h}</th>`).join("");
  const trRows = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("\n");
  return `<table><thead><tr>${thRow}</tr></thead><tbody>${trRows}</tbody></table>`;
}

// ─── basic parsing ────────────────────────────────────────────────────────────

describe("readHtml – basic", () => {
  test("parses single table", () => {
    const html = simpleTable(
      ["a", "b"],
      [
        ["1", "2"],
        ["3", "4"],
      ],
    );
    const dfs = readHtml(html);
    expect(dfs.length).toBe(1);
    const df = dfs[0]!;
    expect(df.columns.toArray()).toEqual(["a", "b"]);
    expect(df.shape).toEqual([2, 2]);
  });

  test("parses multiple tables", () => {
    const t1 = simpleTable(["x"], [["10"]]);
    const t2 = simpleTable(["y"], [["20"]]);
    const dfs = readHtml(t1 + t2);
    expect(dfs.length).toBe(2);
    expect(dfs[0]!.columns.toArray()).toEqual(["x"]);
    expect(dfs[1]!.columns.toArray()).toEqual(["y"]);
  });

  test("returns empty array when no tables found", () => {
    const dfs = readHtml("<p>no tables here</p>");
    expect(dfs.length).toBe(0);
  });

  test("handles empty table (no rows)", () => {
    const dfs = readHtml("<table></table>");
    expect(dfs.length).toBe(1);
    expect(dfs[0]!.shape[0]).toBe(0);
  });

  test("values are numeric by default", () => {
    const html = simpleTable(["n"], [["42"], ["3.14"]]);
    const [df] = readHtml(html);
    const vals = df!.col("n").toArray();
    expect(vals[0]).toBe(42);
    expect(vals[1]).toBeCloseTo(3.14);
  });

  test("header=null uses integer column names", () => {
    const html = "<table><tr><td>a</td><td>b</td></tr><tr><td>1</td><td>2</td></tr></table>";
    const [df] = readHtml(html, { header: null });
    expect(df!.columns.toArray()).toEqual(["0", "1"]);
    expect(df!.shape[0]).toBe(2);
  });
});

// ─── header rows ──────────────────────────────────────────────────────────────

describe("readHtml – header", () => {
  test("header=0 uses first row as columns", () => {
    const html = `<table>
      <tr><td>Name</td><td>Age</td></tr>
      <tr><td>Alice</td><td>30</td></tr>
    </table>`;
    const [df] = readHtml(html, { header: 0 });
    expect(df!.columns.toArray()).toEqual(["Name", "Age"]);
    expect(df!.shape[0]).toBe(1);
  });

  test("deduplicates duplicate column names", () => {
    const html = `<table>
      <tr><th>x</th><th>x</th><th>y</th></tr>
      <tr><td>1</td><td>2</td><td>3</td></tr>
    </table>`;
    const [df] = readHtml(html);
    const cols = df!.columns.toArray();
    expect(cols[0]).toBe("x");
    expect(cols[1]).toBe("x.1");
    expect(cols[2]).toBe("y");
  });
});

// ─── NA handling ──────────────────────────────────────────────────────────────

describe("readHtml – NA values", () => {
  test("empty string becomes null", () => {
    const html = simpleTable(["v"], [[""], ["1"]]);
    const [df] = readHtml(html, { skipBlankLines: false });
    expect(df!.col("v").toArray()[0]).toBeNull();
    expect(df!.col("v").toArray()[1]).toBe(1);
  });

  test("NA / NaN / None become null", () => {
    const html = simpleTable(["v"], [["NA"], ["NaN"], ["None"]]);
    const [df] = readHtml(html);
    for (const v of df!.col("v").toArray()) {
      expect(v).toBeNull();
    }
  });

  test("custom naValues", () => {
    const html = simpleTable(["v"], [["MISSING"], ["5"]]);
    const [df] = readHtml(html, { naValues: ["MISSING"] });
    expect(df!.col("v").toArray()[0]).toBeNull();
    expect(df!.col("v").toArray()[1]).toBe(5);
  });
});

// ─── converters ───────────────────────────────────────────────────────────────

describe("readHtml – converters", () => {
  test("converters=false keeps strings", () => {
    const html = simpleTable(["n"], [["42"]]);
    const [df] = readHtml(html, { converters: false });
    expect(df!.col("n").toArray()[0]).toBe("42");
  });

  test("thousands separator", () => {
    const html = simpleTable(["n"], [["1,000,000"]]);
    const [df] = readHtml(html, { thousands: "," });
    expect(df!.col("n").toArray()[0]).toBe(1_000_000);
  });

  test("decimal separator", () => {
    const html = simpleTable(["n"], [["3,14"]]);
    const [df] = readHtml(html, { decimal: "," });
    expect(df!.col("n").toArray()[0] as number).toBeCloseTo(3.14);
  });
});

// ─── filtering ────────────────────────────────────────────────────────────────

describe("readHtml – filtering", () => {
  test("match selects tables by index", () => {
    const t0 = simpleTable(["a"], [["1"]]);
    const t1 = simpleTable(["b"], [["2"]]);
    const t2 = simpleTable(["c"], [["3"]]);
    const dfs = readHtml(t0 + t1 + t2, { match: [1] });
    expect(dfs.length).toBe(1);
    expect(dfs[0]!.columns.toArray()).toEqual(["b"]);
  });

  test("skipRows", () => {
    const html = simpleTable(["v"], [["0"], ["1"], ["2"], ["3"]]);
    const [df] = readHtml(html, { skipRows: [0, 2] });
    expect(df!.shape[0]).toBe(2);
    expect(df!.col("v").toArray()).toEqual([1, 3]);
  });

  test("nrows limits rows", () => {
    const html = simpleTable(["v"], [["1"], ["2"], ["3"]]);
    const [df] = readHtml(html, { nrows: 2 });
    expect(df!.shape[0]).toBe(2);
  });

  test("skipBlankLines removes empty rows", () => {
    const html = `<table>
      <tr><th>v</th></tr>
      <tr><td>1</td></tr>
      <tr><td></td></tr>
      <tr><td>2</td></tr>
    </table>`;
    const [dfDefault] = readHtml(html);
    expect(dfDefault!.shape[0]).toBe(2); // 1, 2
    expect(dfDefault!.col("v").toArray()).toEqual([1, 2]);

    // With skipBlankLines=false, the blank row is preserved and coerced to null.
    const [df] = readHtml(html, { skipBlankLines: false });
    expect(df!.shape[0]).toBe(3); // 1, null, 2
  });
});

// ─── indexCol ─────────────────────────────────────────────────────────────────

describe("readHtml – indexCol", () => {
  test("sets named column as index", () => {
    const html = simpleTable(
      ["id", "val"],
      [
        ["a", "1"],
        ["b", "2"],
      ],
    );
    const [df] = readHtml(html, { indexCol: "id" });
    // "id" column removed from columns
    expect(df!.columns.toArray()).toEqual(["val"]);
    // index contains "a", "b"
    expect(df!.index.toArray()).toEqual(["a", "b"]);
  });

  test("sets column by integer position as index", () => {
    const html = simpleTable(
      ["id", "val"],
      [
        ["x", "10"],
        ["y", "20"],
      ],
    );
    const [df] = readHtml(html, { indexCol: 0 });
    expect(df!.columns.toArray()).toEqual(["val"]);
  });
});

// ─── HTML entity decoding ─────────────────────────────────────────────────────

describe("readHtml – HTML entities", () => {
  test("decodes &amp; &lt; &gt; &nbsp;", () => {
    const html = `<table>
      <tr><th>k</th></tr>
      <tr><td>a &amp; b</td></tr>
      <tr><td>5 &lt; 10</td></tr>
      <tr><td>hello&nbsp;world</td></tr>
    </table>`;
    const [df] = readHtml(html, { converters: false });
    const vals = df!.col("k").toArray();
    expect(vals[0]).toBe("a & b");
    expect(vals[1]).toBe("5 < 10");
    expect(vals[2]).toBe("hello world");
  });

  test("decodes &#nn; decimal entities", () => {
    const html = `<table><tr><th>k</th></tr><tr><td>&#65;</td></tr></table>`;
    const [df] = readHtml(html, { converters: false });
    expect(df!.col("k").toArray()[0]).toBe("A");
  });

  test("decodes &#xHH; hex entities", () => {
    const html = `<table><tr><th>k</th></tr><tr><td>&#x42;</td></tr></table>`;
    const [df] = readHtml(html, { converters: false });
    expect(df!.col("k").toArray()[0]).toBe("B");
  });
});

// ─── mixed thead / bare rows ──────────────────────────────────────────────────

describe("readHtml – structure variants", () => {
  test("table with only <tr> rows (no thead/tbody)", () => {
    const html = `<table>
      <tr><th>x</th><th>y</th></tr>
      <tr><td>1</td><td>2</td></tr>
    </table>`;
    const [df] = readHtml(html);
    expect(df!.columns.toArray()).toEqual(["x", "y"]);
    expect(df!.shape[0]).toBe(1);
  });

  test("table with tfoot", () => {
    const html = `<table>
      <thead><tr><th>a</th></tr></thead>
      <tbody><tr><td>1</td></tr></tbody>
      <tfoot><tr><td>Total</td></tr></tfoot>
    </table>`;
    const [df] = readHtml(html, { converters: false });
    const vals = df!.col("a").toArray();
    expect(vals).toContain("1");
    expect(vals).toContain("Total");
  });

  test("inline styles and attributes are stripped", () => {
    const html = `<table style="border:1px solid">
      <tr><th class="hdr">Name</th></tr>
      <tr><td id="c1">Alice</td></tr>
    </table>`;
    const [df] = readHtml(html, { converters: false });
    expect(df!.columns.toArray()).toEqual(["Name"]);
    expect(df!.col("Name").toArray()[0]).toBe("Alice");
  });

  test("nested tables are counted separately", () => {
    const inner = simpleTable(["inner"], [["i"]]);
    const outer = `<table><tr><td>${inner}</td></tr></table>`;
    const dfs = readHtml(outer);
    // outer + inner = 2 tables
    expect(dfs.length).toBe(2);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("readHtml – property tests", () => {
  test("roundtrip: all numeric values survive parse", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }).chain((ncols) =>
          fc.array(
            fc.array(fc.integer({ min: -1000, max: 1000 }), {
              minLength: ncols,
              maxLength: ncols,
            }),
            { minLength: 1, maxLength: 10 },
          ),
        ),
        (rows) => {
          const ncols = rows[0]!.length;
          const headers = Array.from({ length: ncols }, (_, i) => `col${i}`);
          const strRows = rows.map((r) => r.map(String));
          const html = simpleTable(headers, strRows);
          const [df] = readHtml(html);
          const flatIn = rows.flat();
          const flatOut = (df?.toRecords() ?? []).flatMap((record) =>
            rows[0]!.map((_, ci) => Number(record[headers[ci]!])),
          );
          // same length
          if (flatIn.length !== flatOut.length) return false;
          return flatIn.every((v, i) => flatOut[i] === v);
        },
      ),
      { numRuns: 50 },
    );
  });

  test("number of returned DataFrames equals number of tables in HTML", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 6 }), (n) => {
        const tables = Array.from({ length: n }, (_, i) => simpleTable([`c${i}`], [["1"]])).join(
          " ",
        );
        const dfs = readHtml(tables);
        return dfs.length === n;
      }),
      { numRuns: 30 },
    );
  });
});

// ─── real-world-like HTML ─────────────────────────────────────────────────────

describe("readHtml – realistic HTML", () => {
  const wikipedia = `<!DOCTYPE html><html><body>
  <h2>Country statistics</h2>
  <table class="wikitable">
    <thead>
      <tr><th>Country</th><th>Population (M)</th><th>GDP (B USD)</th></tr>
    </thead>
    <tbody>
      <tr><td>USA</td><td>331</td><td>23000</td></tr>
      <tr><td>China</td><td>1411</td><td>17700</td></tr>
      <tr><td>Germany</td><td>84</td><td>4500</td></tr>
    </tbody>
  </table>
  </body></html>`;

  test("parses Wikipedia-style table from full HTML doc", () => {
    const [df] = readHtml(wikipedia);
    expect(df!.columns.toArray()).toEqual(["Country", "Population (M)", "GDP (B USD)"]);
    expect(df!.shape).toEqual([3, 3]);
  });

  test("Country column is strings", () => {
    const [df] = readHtml(wikipedia);
    const countries = df!.col("Country").toArray();
    expect(countries).toEqual(["USA", "China", "Germany"]);
  });

  test("numeric columns are numbers", () => {
    const [df] = readHtml(wikipedia);
    expect(df!.col("Population (M)").toArray()[0]).toBe(331);
  });
});
