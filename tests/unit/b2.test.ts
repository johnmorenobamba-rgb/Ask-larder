import { describe, it, expect, afterEach } from "vitest";
import {
  buildUnitStatuses,
  cleanNote,
  describeLimit,
  formatTemp,
  isOutOfRange,
  limitFor,
  localDateKey,
  parseReadingInput,
  readingRangeMessage,
  unitOutOfRange,
  summarise,
  venueTimeZone,
  type LatestReading,
  type UnitLike,
} from "@/lib/compliance/b2";
import { COMPLIANCE_FORMS, STATUS_TAG_LABELS, canSubmitForm } from "@/lib/compliance/catalog";
import { alertEmailsEnabled, decideRecipients, filterRecipients } from "@/lib/compliance/alerts";

const cold: UnitLike = { id: "u-cold", name: "Walk in", unit_type: "cold", min_temp_c: null, max_temp_c: 5 };
const frozen: UnitLike = { id: "u-frz", name: "Freezer", unit_type: "frozen", min_temp_c: null, max_temp_c: -15 };
const hot: UnitLike = { id: "u-hot", name: "Bain marie", unit_type: "hot_hold", min_temp_c: 60, max_temp_c: null };

function isOut(unit: UnitLike, reading: number): boolean {
  const l = limitFor(unit)!;
  return isOutOfRange(l.kind, l.limitC, reading);
}

describe("limits per unit type at the boundaries (equal to the limit is in range)", () => {
  it("cold: max 5", () => {
    expect(isOut(cold, 5.0)).toBe(false);
    expect(isOut(cold, 4.9)).toBe(false);
    expect(isOut(cold, 5.1)).toBe(true);
  });
  it("frozen: max -15", () => {
    expect(isOut(frozen, -15.0)).toBe(false);
    expect(isOut(frozen, -18)).toBe(false);
    expect(isOut(frozen, -14.9)).toBe(true);
  });
  it("hot hold: min 60", () => {
    expect(isOut(hot, 60.0)).toBe(false);
    expect(isOut(hot, 75)).toBe(false);
    expect(isOut(hot, 59.9)).toBe(true);
  });
  it("a unit with no usable limit has none", () => {
    expect(limitFor({ unit_type: "cold", min_temp_c: null, max_temp_c: null })).toBeNull();
    expect(limitFor({ unit_type: "hot_hold", min_temp_c: null, max_temp_c: 5 })).toBeNull();
  });
  it("describes limits with a true minus sign, never a hyphen", () => {
    expect(describeLimit(cold)).toBe("Max 5°C");
    expect(describeLimit(frozen)).toBe("Max −15°C");
    expect(describeLimit(hot)).toBe("Min 60°C");
    expect(formatTemp(-18.04)).toBe("−18°C");
    expect(formatTemp(3.55)).toBe("3.6°C");
  });
});

describe("parsing what a person types", () => {
  it.each([
    ["4", 4],
    ["4.5", 4.5],
    ["4,5", 4.5],
    ["-18", -18],
    [" 60 ", 60],
    [".5", 0.5],
    ["5.", 5],
  ])("accepts %j", (raw, expected) => expect(parseReadingInput(raw as string)).toBe(expected));
  it.each([[""], ["-"], ["."], ["abc"], ["4..5"], ["--4"], ["151"], ["-61"], ["1e3"], ["4 5"]])("rejects %j", (raw) =>
    expect(parseReadingInput(raw as string)).toBeNull(),
  );
});

describe("preview matches the database on units with both limits", () => {
  it("flags a reading below the minimum or above the maximum, whichever are set", () => {
    const both = { min_temp_c: 1, max_temp_c: 5 };
    expect(unitOutOfRange(both, 3)).toBe(false);
    expect(unitOutOfRange(both, 1)).toBe(false);
    expect(unitOutOfRange(both, 5)).toBe(false);
    expect(unitOutOfRange(both, 0.9)).toBe(true);
    expect(unitOutOfRange(both, 5.1)).toBe(true);
    expect(unitOutOfRange({ min_temp_c: 60, max_temp_c: null }, 59.9)).toBe(true);
    expect(unitOutOfRange({ min_temp_c: null, max_temp_c: -15 }, -14.9)).toBe(true);
  });
  it("the range message uses a true minus sign, never a hyphen", () => {
    expect(readingRangeMessage()).toBe("Enter a temperature from −60 to 150 degrees.");
    expect(readingRangeMessage()).not.toMatch(/[-–—]/);
  });
  it("accepts a typed true minus sign or dash as a minus", () => {
    expect(parseReadingInput("−18")).toBe(-18);
    expect(parseReadingInput("–18.5")).toBe(-18.5);
  });
});

describe("venue time zones from state", () => {
  it.each([
    ["VIC", "Australia/Melbourne"],
    ["NSW", "Australia/Sydney"],
    ["ACT", "Australia/Sydney"],
    ["TAS", "Australia/Hobart"],
    ["QLD", "Australia/Brisbane"],
    ["qld", "Australia/Brisbane"],
    ["SA", "Australia/Adelaide"],
    ["WA", "Australia/Perth"],
    ["NT", "Australia/Darwin"],
  ])("%s", (state, tz) => expect(venueTimeZone(state)).toBe(tz));
  it("defaults to Melbourne when null, empty or unknown", () => {
    expect(venueTimeZone(null)).toBe("Australia/Melbourne");
    expect(venueTimeZone(undefined)).toBe("Australia/Melbourne");
    expect(venueTimeZone("")).toBe("Australia/Melbourne");
    expect(venueTimeZone("XX")).toBe("Australia/Melbourne");
  });
});

describe("local day boundaries and daylight saving", () => {
  const mel = "Australia/Melbourne";
  const bne = "Australia/Brisbane";
  it("Melbourne DST starts Sunday 4 Oct 2026 (02:00 AEST becomes 03:00 AEDT)", () => {
    expect(localDateKey("2026-10-03T14:30:00Z", mel)).toBe("2026-10-04"); // 00:30 AEST on 4 Oct
    // 13:30Z is 00:30 AEDT on 5 Oct. A naive +10 offset would wrongly say 4 Oct.
    expect(localDateKey("2026-10-04T13:30:00Z", mel)).toBe("2026-10-05");
    expect(localDateKey("2026-10-04T12:59:00Z", mel)).toBe("2026-10-04");
  });
  it("Melbourne DST ends Sunday 4 Apr 2027 (03:00 AEDT becomes 02:00 AEST)", () => {
    expect(localDateKey("2027-04-03T15:30:00Z", mel)).toBe("2027-04-04"); // 02:30 AEDT on 4 Apr
    // 13:30Z is 23:30 AEST on 4 Apr. A naive +11 offset would wrongly say 5 Apr.
    expect(localDateKey("2027-04-04T13:30:00Z", mel)).toBe("2027-04-04");
    expect(localDateKey("2027-04-04T14:00:00Z", mel)).toBe("2027-04-05");
  });
  it("Brisbane has no daylight saving: always UTC+10", () => {
    expect(localDateKey("2026-10-04T13:30:00Z", bne)).toBe("2026-10-04"); // same instant Melbourne said 5 Oct
    expect(localDateKey("2026-10-04T14:00:00Z", bne)).toBe("2026-10-05");
    expect(localDateKey("2027-01-15T13:59:00Z", bne)).toBe("2027-01-15");
    expect(localDateKey("2027-01-15T14:00:00Z", bne)).toBe("2027-01-16");
    // mid summer, when Melbourne is on +11 and Brisbane is not
    expect(localDateKey("2027-01-15T13:30:00Z", mel)).toBe("2027-01-16");
  });
  it("Perth is UTC+8", () => {
    expect(localDateKey("2026-10-04T15:59:00Z", "Australia/Perth")).toBe("2026-10-04");
    expect(localDateKey("2026-10-04T16:00:00Z", "Australia/Perth")).toBe("2026-10-05");
  });
});

describe("done today and open flags (from the latest effective reading per unit)", () => {
  const tz = "Australia/Melbourne";
  const now = new Date("2026-09-30T23:00:00Z"); // 1 Oct 2026, 09:00 AEST
  const reading = (unit: UnitLike, id: string, submitted_at: string, outOfRange: boolean, value: number): LatestReading => ({
    id,
    unit_id: unit.id,
    out_of_range: outOfRange,
    corrective_action: outOfRange ? "Moved stock" : null,
    submitted_at,
    submitted_by_name: "Kit Hand",
    payload: { reading_c: value },
  });

  it("a reading logged today marks the unit done", () => {
    const s = buildUnitStatuses([cold], [reading(cold, "r1", "2026-09-30T22:00:00Z", false, 4)], now, tz);
    expect(s[0].doneToday).toBe(true);
    expect(s[0].openFlag).toBe(false);
    expect(s[0].readingC).toBe(4);
  });
  it("a reading from yesterday does not count as done today", () => {
    const s = buildUnitStatuses([cold], [reading(cold, "r1", "2026-09-29T22:00:00Z", false, 4)], now, tz);
    expect(s[0].doneToday).toBe(false);
  });
  it("a unit with no readings is not done and has no flag", () => {
    const s = buildUnitStatuses([cold], [], now, tz);
    expect(s[0]).toMatchObject({ doneToday: false, openFlag: false, latest: null, readingC: null });
  });
  it("an out of range flag from a previous day with no recheck STAYS OPEN", () => {
    const s = buildUnitStatuses([cold], [reading(cold, "r1", "2026-09-28T01:00:00Z", true, 9)], now, tz);
    expect(s[0].openFlag).toBe(true);
    expect(s[0].doneToday).toBe(false);
  });
  it("a LATER in range reading closes the flag", () => {
    const s = buildUnitStatuses([cold], [reading(cold, "r2", "2026-09-30T22:30:00Z", false, 3.5)], now, tz);
    expect(s[0].openFlag).toBe(false);
  });
  it("readings of retired or unknown units are ignored", () => {
    const s = buildUnitStatuses([cold], [reading({ ...hot, id: "retired" }, "r9", "2026-09-30T22:00:00Z", true, 40)], now, tz);
    expect(s).toHaveLength(1);
    expect(s[0].latest).toBeNull();
  });
  it("summarises totals, done today and open flags", () => {
    const s = buildUnitStatuses(
      [cold, frozen, hot],
      [reading(cold, "a", "2026-09-30T22:00:00Z", false, 4), reading(frozen, "b", "2026-09-27T22:00:00Z", true, -10)],
      now,
      tz,
    );
    expect(summarise(s)).toEqual({ total: 3, doneToday: 1, openFlags: 1 });
  });
  it("the day boundary follows the venue zone: 4 Oct 23:00 AEDT is the previous local day at 00:45 on 5 Oct", () => {
    const nowAfterMidnight = new Date("2026-10-04T13:45:00Z"); // 5 Oct 00:45 AEDT
    const s = buildUnitStatuses([cold], [reading(cold, "r1", "2026-10-04T12:00:00Z", false, 4)], nowAfterMidnight, tz);
    expect(s[0].doneToday).toBe(false);
  });
});

describe("catalog", () => {
  const b2 = COMPLIANCE_FORMS.B2;
  it("tags: form M*, cold and hot hold legal, frozen best practice, frequency best practice", () => {
    expect(b2.statusTag).toBe("M*");
    expect(b2.limits.cold.tag).toBe("M");
    expect(b2.limits.hot_hold.tag).toBe("M");
    expect(b2.limits.frozen.tag).toBe("BP");
    expect(b2.frequency.tag).toBe("BP");
    expect(STATUS_TAG_LABELS.BP).toBe("Best practice");
    expect(STATUS_TAG_LABELS.M).toBe("Legally required");
  });
  it("never calls retention or frequency a legal minimum, and frozen is not called legally required", () => {
    const text = [b2.retentionNote, b2.frequency.note, b2.limits.frozen.basis, b2.limits.frozen.label].join(" ");
    expect(text).not.toMatch(/legal(ly)?\s+(minimum|requirement|required)/i);
    expect(b2.limits.frozen.basis).toMatch(/FoodSmart/);
    expect(b2.retentionNote).toMatch(/default/);
  });
  it("owner facing copy has no hyphens, en dashes or em dashes", () => {
    const strings = [
      b2.title,
      b2.statusNote,
      b2.retentionNote,
      b2.frequency.note,
      ...Object.values(b2.limits).flatMap((l) => [l.label, l.basis]),
      ...Object.values(STATUS_TAG_LABELS),
    ];
    for (const s of strings) expect(s).not.toMatch(/[-–—]/);
  });
  it("audience: BOH plus manager tier and owner; FOH and no department are denied", () => {
    expect(canSubmitForm(b2, { isManagerTier: false, department: "BOH" })).toBe(true);
    expect(canSubmitForm(b2, { isManagerTier: false, department: "FOH" })).toBe(false);
    expect(canSubmitForm(b2, { isManagerTier: false, department: null })).toBe(false);
    expect(canSubmitForm(b2, { isManagerTier: true, department: "FOH" })).toBe(true);
    expect(canSubmitForm(b2, { isManagerTier: true, department: null })).toBe(true);
  });
});

describe("owner alert recipients and the env gate", () => {
  const prev = process.env.COMPLIANCE_ALERT_EMAIL_ENABLED;
  afterEach(() => {
    if (prev === undefined) delete process.env.COMPLIANCE_ALERT_EMAIL_ENABLED;
    else process.env.COMPLIANCE_ALERT_EMAIL_ENABLED = prev;
  });
  it("excludes synthetic @venue.internal addresses, blanks and duplicates, and normalises case", () => {
    expect(
      filterRecipients(["Owner@Pub.com.au", "owner@pub.com.au", "staff-123@venue.internal", null, "", "not an email", "mgr@pub.com.au"]),
    ).toEqual(["owner@pub.com.au", "mgr@pub.com.au"]);
  });
  it("outside production a test recipient is mandatory and exclusive (no real owner can be emailed)", () => {
    const real = ["owner@pub.com.au", "mgr@pub.com.au"];
    expect(decideRecipients({ production: false, testRecipient: undefined, venueEmails: real })).toEqual({
      mode: "refuse",
      reason: "not production and no test recipient set",
    });
    expect(decideRecipients({ production: false, testRecipient: "delivered@resend.dev", venueEmails: real })).toEqual({
      mode: "send",
      to: ["delivered@resend.dev"],
    });
    expect(decideRecipients({ production: false, testRecipient: "not an email", venueEmails: real }).mode).toBe("refuse");
  });
  it("in production the real owner and manager addresses are used, minus synthetic ones", () => {
    expect(decideRecipients({ production: true, testRecipient: undefined, venueEmails: ["Owner@pub.com.au", "staff-1@venue.internal"] })).toEqual({
      mode: "send",
      to: ["owner@pub.com.au"],
    });
    expect(decideRecipients({ production: true, testRecipient: undefined, venueEmails: ["staff-1@venue.internal", null] }).mode).toBe("refuse");
  });
  it("sending is off unless the flag is exactly the string true", () => {
    delete process.env.COMPLIANCE_ALERT_EMAIL_ENABLED;
    expect(alertEmailsEnabled()).toBe(false);
    process.env.COMPLIANCE_ALERT_EMAIL_ENABLED = "1";
    expect(alertEmailsEnabled()).toBe(false);
    process.env.COMPLIANCE_ALERT_EMAIL_ENABLED = "true";
    expect(alertEmailsEnabled()).toBe(true);
  });
});

describe("cleanNote (free text made safe for jsonb)", () => {
  const NUL = String.fromCharCode(0);
  const HIGH = String.fromCharCode(0xd83d);
  const LOW = String.fromCharCode(0xde00);
  it("drops NUL characters", () => {
    expect(cleanNote("a" + NUL + "b")).toBe("ab");
  });
  it("drops a lone high or lone low surrogate", () => {
    expect(cleanNote("a" + HIGH + "b")).toBe("ab");
    expect(cleanNote("a" + LOW + "b")).toBe("ab");
  });
  it("keeps a valid surrogate pair (an emoji)", () => {
    expect(cleanNote("ok " + HIGH + LOW)).toBe("ok " + HIGH + LOW);
  });
  it("cuts by whole characters and never splits a pair", () => {
    const pair = HIGH + LOW;
    expect(cleanNote(pair.repeat(3), 2)).toBe(pair.repeat(2));
    expect(cleanNote("abcdef", 3)).toBe("abc");
  });
  it("trims, and whitespace only becomes empty", () => {
    expect(cleanNote("  moved the stock  ")).toBe("moved the stock");
    expect(cleanNote("   " + NUL + "  ")).toBe("");
  });
});
