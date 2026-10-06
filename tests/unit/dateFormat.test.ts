import { describe, it, expect } from "vitest";
import { formatCalendarDate, formatDate, formatDateTime, formatTimeOfDay } from "../../src/lib/format/date";

describe("Australian date formats in the venue's time zone", () => {
  const instant = new Date("2026-10-05T14:35:02Z"); // 1:35 am on 6 Oct in Melbourne (AEDT)
  it("writes day, month, year", () => {
    expect(formatDate(instant, "Australia/Melbourne")).toBe("6 Oct 2026");
    expect(formatDate("2026-10-05T14:35:02Z", "Australia/Melbourne")).toBe("6 Oct 2026");
  });
  it("uses the venue's own time zone, so the day can differ", () => {
    expect(formatDate(instant, "Australia/Perth")).toBe("5 Oct 2026"); // 10:35 pm on the 5th in Perth
    expect(formatDate(instant, "Australia/Brisbane")).toBe("6 Oct 2026");
  });
  it("writes date and time with am or pm", () => {
    expect(formatDateTime(instant, "Australia/Melbourne")).toMatch(/^6 Oct 2026,? 1:35 am$/i);
    expect(formatTimeOfDay(instant, "Australia/Melbourne")).toMatch(/^1:35:02 am$/i);
  });
  it("never writes month first or a numeric US style", () => {
    expect(formatDate(instant)).not.toMatch(/^\d+\/\d+\/\d+$/);
    expect(formatDate(new Date("2026-01-02T12:00:00Z"), "Australia/Melbourne")).toBe("2 Jan 2026");
  });
  it("writes a stored calendar date without a time zone shift", () => {
    expect(formatCalendarDate("2026-10-14")).toBe("14 Oct 2026");
    expect(formatCalendarDate("2026-01-01")).toBe("1 Jan 2026");
    expect(formatCalendarDate("2026-12-31")).toBe("31 Dec 2026");
    expect(formatCalendarDate("not a date")).toBe("not a date");
  });
  it("handles the daylight saving change", () => {
    expect(formatDate(new Date("2026-10-03T14:30:00Z"), "Australia/Melbourne")).toBe("4 Oct 2026"); // 12:30 am AEST on 4 Oct
    expect(formatDateTime(new Date("2026-10-03T16:30:00Z"), "Australia/Melbourne")).toMatch(/^4 Oct 2026,? 3:30 am$/i); // after the clocks go forward at 2 am
  });
});
