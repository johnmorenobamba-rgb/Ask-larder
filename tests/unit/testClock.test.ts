import { afterEach, describe, expect, it, vi } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { resolveNow } from "../../src/lib/compliance/engine/testClock";

afterEach(() => vi.unstubAllEnvs());

const ASOF = "2020-01-01T00:00:00.000Z";

describe("?asof= clock seam (P29 / task 6)", () => {
  it("is honoured only when NODE_ENV is development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(resolveNow(ASOF).toISOString()).toBe(ASOF);
  });
  it("is ignored in production, test and any other mode", () => {
    for (const mode of ["production", "test", ""]) {
      vi.stubEnv("NODE_ENV", mode);
      const before = Date.now();
      const got = resolveNow(ASOF).getTime();
      expect(got).toBeGreaterThanOrEqual(before);
      expect(got).toBeLessThanOrEqual(Date.now());
    }
  });
  it("ignores junk and arrays even in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    const before = Date.now();
    expect(resolveNow("not a date").getTime()).toBeGreaterThanOrEqual(before);
    expect(resolveNow([ASOF, ASOF]).getTime()).toBeGreaterThanOrEqual(before);
    expect(resolveNow(undefined).getTime()).toBeGreaterThanOrEqual(before);
  });
  it("only read-only pages use the seam: no API route and no library file other than the seam imports it", () => {
    const users: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(name) && readFileSync(p, "utf8").includes("testClock")) users.push(p.split(String.fromCharCode(92)).join("/"));
      }
    };
    walk("src");
    expect(users.filter((p) => p.includes("/api/"))).toEqual([]);
    expect(users.every((p) => p.endsWith("/page.tsx"))).toBe(true);
    expect(users.length).toBe(4);
  });
});
