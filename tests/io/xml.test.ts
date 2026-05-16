/**
 * Tests for readXml / toXml — XML I/O for DataFrame.
 */

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import { DataFrame } from "../../src/index.ts";
import { readXml, toXml } from "../../src/index.ts";

// ─── basic readXml ────────────────────────────────────────────────────────────

describe("readXml — basic parsing", () => {
  test("parses child-element rows", () => {
    const xml = `<?xml version="1.0"?>
<data>
  <row><name>Alice</name><age>30</age></row>
  <row><name>Bob</name><age>25</age></row>
</data>`;
    const df = readXml(xml);
    expect(df.shape).toEqual([2, 2]);
    expect(df.columns.toArray()).toEqual(["name", "age"]);
    expect(df.col("name").toArray()).toEqual(["Alice", "Bob"]);
    expect(df.col("age").toArray()).toEqual([30, 25]);
  });

  test("parses attribute rows", () => {
    const xml = `<data>
  <row id="1" name="Alice"/>
  <row id="2" name="Bob"/>
</data>`;
    const df = readXml(xml);
    expect(df.shape).toEqual([2, 2]);
    expect(df.col("id").toArray()).toEqual([1, 2]);
    expect(df.col("name").toArray()).toEqual(["Alice", "Bob"]);
  });

  test("mixes attributes and child elements", () => {
    const xml = `<data>
  <item id="1"><label>foo</label></item>
  <item id="2"><label>bar</label></item>
</data>`;
    const df = readXml(xml, { rowTag: "item" });
    expect(df.shape).toEqual([2, 2]);
    expect(df.col("id").toArray()).toEqual([1, 2]);
    expect(df.col("label").toArray()).toEqual(["foo", "bar"]);
  });

  test("auto-detects rowTag", () => {
    const xml = `<root>
  <record><x>1</x></record>
  <record><x>2</x></record>
  <record><x>3</x></record>
</root>`;
    const df = readXml(xml);
    expect(df.shape[0]).toBe(3);
    expect(df.col("x").toArray()).toEqual([1, 2, 3]);
  });

  test("handles empty XML gracefully", () => {
    const df = readXml("<data></data>");
    expect(df.shape).toEqual([0, 0]);
  });

  test("returns empty DataFrame for no matching rows", () => {
    const xml = `<data><other>x</other></data>`;
    const df = readXml(xml, { rowTag: "row" });
    expect(df.shape).toEqual([0, 0]);
  });
});

// ─── options ──────────────────────────────────────────────────────────────────

describe("readXml — options", () => {
  const xml = `<data>
  <row><a>1</a><b>hello</b><c>3.14</c></row>
  <row><a>2</a><b>world</b><c>2.71</c></row>
  <row><a>3</a><b>foo</b><c>1.41</c></row>
</data>`;

  test("usecols filters columns", () => {
    const df = readXml(xml, { usecols: ["a", "c"] });
    expect(df.columns.toArray()).toEqual(["a", "c"]);
    expect(df.shape[1]).toBe(2);
  });

  test("nrows limits rows", () => {
    const df = readXml(xml, { nrows: 2 });
    expect(df.shape[0]).toBe(2);
  });

  test("converters=false keeps strings", () => {
    const df = readXml(xml, { converters: false });
    expect(df.col("a").toArray()).toEqual(["1", "2", "3"]);
  });

  test("naValues marks as null", () => {
    const xml2 = `<data>
  <row><x>1</x></row>
  <row><x>MISSING</x></row>
  <row><x>3</x></row>
</data>`;
    const df = readXml(xml2, { naValues: ["MISSING"] });
    expect(df.col("x").toArray()).toEqual([1, null, 3]);
  });

  test("indexCol by name", () => {
    const df = readXml(xml, { indexCol: "a" });
    expect(df.columns.toArray()).toEqual(["b", "c"]);
    expect(df.index.toArray()).toEqual([1, 2, 3]);
  });

  test("indexCol by number", () => {
    const df = readXml(xml, { indexCol: 0 });
    expect(df.columns.toArray()).toEqual(["b", "c"]);
    expect(df.index.toArray()).toEqual([1, 2, 3]);
  });

  test("attribs=false ignores attributes", () => {
    const xml2 = `<data>
  <row id="1"><name>Alice</name></row>
  <row id="2"><name>Bob</name></row>
</data>`;
    const df = readXml(xml2, { attribs: false });
    expect(df.columns.toArray()).toEqual(["name"]);
  });

  test("elems=false ignores child elements", () => {
    const xml2 = `<data>
  <row id="1"><name>Alice</name></row>
  <row id="2"><name>Bob</name></row>
</data>`;
    const df = readXml(xml2, { elems: false });
    expect(df.columns.toArray()).toEqual(["id"]);
  });
});

// ─── entity + CDATA handling ──────────────────────────────────────────────────

describe("readXml — entities and CDATA", () => {
  test("decodes named entities", () => {
    const xml = `<data><row><v>a &amp; b &lt; c</v></row></data>`;
    const df = readXml(xml, { converters: false });
    expect(df.col("v").at(0)).toBe("a & b < c");
  });

  test("decodes numeric entities", () => {
    const xml = `<data><row><v>&#65;&#x42;</v></row></data>`;
    const df = readXml(xml, { converters: false });
    expect(df.col("v").at(0)).toBe("AB");
  });

  test("CDATA section text is read as-is", () => {
    const xml = `<data><row><v><![CDATA[hello & <world>]]></v></row></data>`;
    const df = readXml(xml, { converters: false });
    expect(df.col("v").at(0)).toBe("hello & <world>");
  });

  test("comments are ignored", () => {
    const xml = `<data>
  <!-- this is a comment -->
  <row><x>1</x></row>
  <!-- another comment -->
  <row><x>2</x></row>
</data>`;
    const df = readXml(xml);
    expect(df.shape[0]).toBe(2);
  });
});

// ─── namespace handling ───────────────────────────────────────────────────────

describe("readXml — namespaces", () => {
  test("strips namespace prefixes from element names", () => {
    const xml = `<ns:data xmlns:ns="http://example.com">
  <ns:row><ns:name>Alice</ns:name></ns:row>
</ns:data>`;
    const df = readXml(xml, { rowTag: "row" });
    expect(df.columns.toArray()).toEqual(["name"]);
    expect(df.col("name").at(0)).toBe("Alice");
  });

  test("strips namespace prefixes from attribute names", () => {
    const xml = `<data>
  <row xml:id="1" ns:val="hello"/>
</data>`;
    const df = readXml(xml);
    expect(df.columns.toArray()).toContain("id");
    expect(df.columns.toArray()).toContain("val");
  });
});

// ─── default NA values ────────────────────────────────────────────────────────

describe("readXml — built-in NA values", () => {
  test("empty string becomes null", () => {
    const xml = `<data><row><x></x></row></data>`;
    const df = readXml(xml);
    expect(df.col("x").at(0)).toBeNull();
  });

  test("NA string becomes null", () => {
    const xml = `<data><row><x>NA</x></row></data>`;
    const df = readXml(xml);
    expect(df.col("x").at(0)).toBeNull();
  });

  test("NaN string becomes null", () => {
    const xml = `<data><row><x>NaN</x></row></data>`;
    const df = readXml(xml);
    expect(df.col("x").at(0)).toBeNull();
  });
});

// ─── toXml basic ─────────────────────────────────────────────────────────────

describe("toXml — basic serialization", () => {
  test("produces valid XML with child elements by default", () => {
    const df = DataFrame.fromColumns({ name: ["Alice", "Bob"], age: [30, 25] });
    const xml = toXml(df);
    expect(xml).toContain("<?xml");
    expect(xml).toContain("<data>");
    expect(xml).toContain("<row>");
    expect(xml).toContain("<name>Alice</name>");
    expect(xml).toContain("<age>30</age>");
    expect(xml).toContain("</data>");
  });

  test("custom root and row names", () => {
    const df = DataFrame.fromColumns({ x: [1, 2] });
    const xml = toXml(df, { rootName: "records", rowName: "record" });
    expect(xml).toContain("<records>");
    expect(xml).toContain("<record>");
    expect(xml).toContain("</records>");
  });

  test("attribs mode emits attributes", () => {
    const df = DataFrame.fromColumns({ id: [1, 2], name: ["Alice", "Bob"] });
    const xml = toXml(df, { attribs: true });
    expect(xml).toContain('id="1"');
    expect(xml).toContain('name="Alice"');
  });

  test("xmlDeclaration=false omits PI", () => {
    const df = DataFrame.fromColumns({ x: [1] });
    const xml = toXml(df, { xmlDeclaration: false });
    expect(xml).not.toContain("<?xml");
    expect(xml).toContain("<data>");
  });

  test("namespaces are declared on root", () => {
    const df = DataFrame.fromColumns({ x: [1] });
    const xml = toXml(df, { namespaces: { xsi: "http://www.w3.org/2001/XMLSchema-instance" } });
    expect(xml).toContain('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
  });

  test("indent=null produces compact output", () => {
    const df = DataFrame.fromColumns({ x: [1] });
    const xml = toXml(df, { indent: null });
    expect(xml).not.toContain("  "); // no leading spaces
  });

  test("cdataCols wraps in CDATA", () => {
    const df = DataFrame.fromColumns({ html: ["<b>bold</b>"] });
    const xml = toXml(df, { cdataCols: ["html"] });
    expect(xml).toContain("<![CDATA[<b>bold</b>]]>");
  });

  test("encodes entities in non-CDATA columns", () => {
    const df = DataFrame.fromColumns({ v: ["a & b"] });
    const xml = toXml(df, { cdataCols: [] });
    expect(xml).toContain("a &amp; b");
  });

  test("empty DataFrame produces root with no rows", () => {
    const df = DataFrame.fromColumns({});
    const xml = toXml(df);
    expect(xml).toContain("<data>");
    expect(xml).toContain("</data>");
    expect(xml).not.toContain("<row>");
  });
});

// ─── round-trip ───────────────────────────────────────────────────────────────

describe("toXml / readXml round-trip", () => {
  test("round-trips string columns", () => {
    const df = DataFrame.fromColumns({
      name: ["Alice", "Bob", "Carol"],
      city: ["NYC", "LA", "Chicago"],
    });
    const xml = toXml(df, { xmlDeclaration: false });
    const df2 = readXml(xml, { converters: false });
    expect(df2.shape).toEqual(df.shape);
    expect(df2.col("name").toArray()).toEqual(["Alice", "Bob", "Carol"]);
    expect(df2.col("city").toArray()).toEqual(["NYC", "LA", "Chicago"]);
  });

  test("round-trips numeric columns", () => {
    const df = DataFrame.fromColumns({ x: [1, 2, 3], y: [4.5, 5.6, 6.7] });
    const xml = toXml(df);
    const df2 = readXml(xml);
    expect(df2.col("x").toArray()).toEqual([1, 2, 3]);
    expect(df2.col("y").toArray()).toEqual([4.5, 5.6, 6.7]);
  });

  test("round-trips attribs mode", () => {
    const df = DataFrame.fromColumns({ id: [1, 2], name: ["Alice", "Bob"] });
    const xml = toXml(df, { attribs: true });
    const df2 = readXml(xml);
    expect(df2.shape).toEqual(df.shape);
    expect(df2.col("id").toArray()).toEqual([1, 2]);
    expect(df2.col("name").toArray()).toEqual(["Alice", "Bob"]);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("readXml / toXml — property tests", () => {
  const safeStr = fc
    .stringMatching(/^[A-Za-z0-9 _-]*$/)
    .filter((s) => s.length > 0 && !["NA", "NaN", "N/A", "null", "None", "nan"].includes(s));

  test("round-trip: toXml then readXml preserves shape", () => {
    fc.assert(
      fc.property(
        fc.array(safeStr, { minLength: 1, maxLength: 4 }),
        fc.integer({ min: 1, max: 5 }),
        (colNames, nRows) => {
          const uniqueCols = [...new Set(colNames)];
          const colData: Record<string, string[]> = {};
          for (const c of uniqueCols) {
            colData[c] = Array.from({ length: nRows }, (_, i) => `v${i}`);
          }
          const df = DataFrame.fromColumns(colData);
          const xml = toXml(df);
          const df2 = readXml(xml, { converters: false });
          return df2.shape[0] === nRows && df2.shape[1] === uniqueCols.length;
        },
      ),
      { numRuns: 50 },
    );
  });

  test("toXml produces valid XML structure", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),
        (nRows) => {
          const df = DataFrame.fromColumns({ x: Array.from({ length: nRows }, (_, i) => i) });
          const xml = toXml(df);
          return xml.includes("<data>") && xml.includes("</data>");
        },
      ),
      { numRuns: 50 },
    );
  });

  test("nrows limits output correctly", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 10 }),
        (total, limit) => {
          const df = DataFrame.fromColumns({ x: Array.from({ length: total }, (_, i) => i) });
          const xml = toXml(df);
          const df2 = readXml(xml, { nrows: limit });
          return df2.shape[0] === Math.min(total, limit);
        },
      ),
      { numRuns: 50 },
    );
  });
});
