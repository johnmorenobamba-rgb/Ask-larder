import { describe, expect, it } from "vitest";
import { csvCell, parseCsv, toCsv, flattenValues, CSV_BOM } from "../../src/lib/export/csv";

describe("export csv", () => {
  it("quotes commas, quotes and line breaks, and doubles inner quotes", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
    expect(csvCell("plain")).toBe("plain");
  });
  it("neutralises formula cells but leaves real numbers alone", () => {
    for (const bad of ["=1+1", "+cmd", "-cmd", "@SUM(A1)", "\tcmd", "\rcmd"]) expect(csvCell(bad), bad).toMatch(/^"?'/);
    expect(csvCell("=HYPERLINK(\"x\",\"y\")")).toBe('"\'=HYPERLINK(""x"",""y"")"');
    expect(csvCell(-18.5)).toBe("-18.5");
    expect(csvCell("-18.5")).toBe("-18.5");
    expect(csvCell("-18 degrees")).toBe("'-18 degrees");
  });
  it("writes null and undefined as empty, objects as JSON, booleans as words", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
    expect(csvCell({ a: 1 })).toBe('"{""a"":1}"');
    expect(csvCell(true)).toBe("true");
  });
  it("starts with a byte order mark and ends lines with CRLF", () => {
    const out = toCsv(["A", "B"], [["1", "2"]]);
    expect(out.startsWith(CSV_BOM)).toBe(true);
    expect(out).toBe(CSV_BOM + "A,B\r\n1,2\r\n");
  });
  it("round trips awkward cells through the parser", () => {
    const rows = [["O'Brien, Sam \"Sammy\"", "two\nlines", "Crème brûlée", ""], ["=cmd", "x", "y", "z"]];
    const parsed = parseCsv(toCsv(["n", "m", "c", "e"], rows));
    expect(parsed[0]).toEqual(["n", "m", "c", "e"]);
    expect(parsed[1]).toEqual(["O'Brien, Sam \"Sammy\"", "two\nlines", "Crème brûlée", ""]);
    expect(parsed[2][0]).toBe("'=cmd");
    expect(parsed).toHaveLength(3);
  });
  it("flattens nested values to dotted keys", () => {
    expect(flattenValues({ items: { a: "pass", b: "fail" }, temp_c: 4, list: ["x", "y"] })).toEqual({ "items.a": "pass", "items.b": "fail", temp_c: 4, list: "x; y" });
    expect(flattenValues(null)).toEqual({});
  });
});
