import { describe, expect, it } from "vitest";
import { rosterDisplayNames } from "../../src/lib/staff/rosterDisplayName";

const one = (name: string) => rosterDisplayNames([{ id: "1", name }]).get("1");

describe("roster display names", () => {
  it("shows first name and the first letter of the last name", () => {
    expect(one("Priya Nair")).toBe("Priya N.");
  });
  it("leaves single word names alone", () => {
    expect(one("Cher")).toBe("Cher");
    expect(one("cher")).toBe("cher");
  });
  it("handles apostrophes, hyphens, spaces, case and unicode", () => {
    expect(one("Meg O'Brien")).toBe("Meg O.");
    expect(one("Anna Smith-Jones")).toBe("Anna S.");
    expect(one("  Anna   van der Berg ")).toBe("Anna B.");
    expect(one("JOHN SMITH")).toBe("John S.");
    expect(one("priya nair")).toBe("Priya N.");
    expect(one("Zoë Éclair")).toBe("Zoë É.");
  });
  it("lengthens the last name until colliding people differ", () => {
    const m = rosterDisplayNames([{ id: "1", name: "Priya Nair" }, { id: "2", name: "Priya Nash" }]);
    expect(m.get("1")).toBe("Priya Nai.");
    expect(m.get("2")).toBe("Priya Nas.");
  });
  it("never shows a whole surname even when one is a prefix of another", () => {
    const m = rosterDisplayNames([{ id: "1", name: "Priya Nair" }, { id: "2", name: "Priya Nairn" }]);
    for (const v of m.values()) expect(v).not.toMatch(/Nairn?(?!.)/);
    expect(new Set(m.values()).size).toBe(2);
  });
  it("adds a number for identical names", () => {
    const m = rosterDisplayNames([{ id: "b", name: "Sam Lee" }, { id: "a", name: "Sam Lee" }]);
    expect(m.get("a")).toBe("Sam L. 1");
    expect(m.get("b")).toBe("Sam L. 2");
  });
  it("never returns a full surname when nobody collides", () => {
    const m = rosterDisplayNames([{ id: "1", name: "Priya Nair" }, { id: "2", name: "Meg O'Brien" }, { id: "3", name: "Sam Lee" }]);
    for (const v of m.values()) expect(v).not.toMatch(/Nair|Brien|Lee/);
  });
});
