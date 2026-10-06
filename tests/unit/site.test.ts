import { describe, expect, it } from "vitest";
import { siteUrl, stationScanUrl, SITE_URL_FALLBACK } from "../../src/lib/site";

describe("canonical site url", () => {
  it("falls back to the live site when unset, empty or not a url", () => {
    for (const v of [undefined, "", "   ", "asklarder.com.au", "javascript:alert(1)"]) expect(siteUrl(v)).toBe(SITE_URL_FALLBACK);
  });
  it("uses the configured address and drops trailing slashes", () => {
    expect(siteUrl("https://example.test/")).toBe("https://example.test");
    expect(siteUrl(" https://example.test// ")).toBe("https://example.test");
  });
  it("builds the station scan address from the canonical base, never a host", () => {
    expect(stationScanUrl("the-pub", "abc123", "")).toBe("https://asklarder.com.au/the-pub/station/abc123");
    expect(stationScanUrl("the-pub", "abc123", "https://example.test")).toBe("https://example.test/the-pub/station/abc123");
  });
});
