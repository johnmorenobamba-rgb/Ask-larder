import { describe, expect, it } from "vitest";
import { formStatus, periodStart, previousPeriodStart } from "../../src/lib/compliance/engine/due";
import { compileRules, evaluateFail, findStage } from "../../src/lib/compliance/engine/rules";
import { FORMS, FORM_BY_ID, HELD_FORMS } from "../../src/lib/compliance/engine/forms";
import { parseNumberInput } from "../../src/lib/compliance/engine/numberInput";
import { activatedAt, canFillStage, canOpenForm, gateRoles, isFormOn, visibleRoles, ENGINE_LIVE_FROM } from "../../src/lib/compliance/engine/activation";
import type { ActivationContext, FieldDef, FormDef } from "../../src/lib/compliance/engine/types";

const MEL = "Australia/Melbourne";
const BNE = "Australia/Brisbane";

describe("period boundaries (venue local time, DST safe)", () => {
  it("daily: Melbourne DST start (4 Oct 2026, 2am jumps to 3am)", () => {
    expect(periodStart("daily", "2026-10-03T13:59:00Z", MEL)).toBe("2026-10-03"); // 23:59 AEST
    expect(periodStart("daily", "2026-10-03T14:00:00Z", MEL)).toBe("2026-10-04"); // 00:00 AEST
    expect(periodStart("daily", "2026-10-03T15:59:00Z", MEL)).toBe("2026-10-04"); // 01:59 AEST
    expect(periodStart("daily", "2026-10-03T16:00:00Z", MEL)).toBe("2026-10-04"); // 03:00 AEDT
    expect(previousPeriodStart("daily", "2026-10-03T16:00:00Z", MEL)).toBe("2026-10-03");
    // the next local midnight is at 13:00Z, after the clocks changed
    expect(periodStart("daily", "2026-10-04T12:59:00Z", MEL)).toBe("2026-10-04");
    expect(periodStart("daily", "2026-10-04T13:00:00Z", MEL)).toBe("2026-10-05");
  });
  it("daily: Melbourne DST end (4 Apr 2027, 3am falls back to 2am)", () => {
    expect(periodStart("daily", "2027-04-03T15:59:00Z", MEL)).toBe("2027-04-04"); // 02:59 AEDT
    expect(periodStart("daily", "2027-04-03T16:00:00Z", MEL)).toBe("2027-04-04"); // 02:00 AEST again
    expect(periodStart("daily", "2027-04-03T12:59:00Z", MEL)).toBe("2027-04-03"); // 23:59 AEDT
    expect(periodStart("daily", "2027-04-03T13:00:00Z", MEL)).toBe("2027-04-04"); // 00:00 AEDT
    expect(periodStart("daily", "2027-04-04T13:59:00Z", MEL)).toBe("2027-04-04"); // 23:59 AEST
    expect(periodStart("daily", "2027-04-04T14:00:00Z", MEL)).toBe("2027-04-05");
  });
  it("daily: Brisbane has no DST so the boundary is always 14:00Z", () => {
    for (const day of ["2026-10-03", "2027-04-03", "2027-01-15"]) {
      const next = new Date(`${day}T14:00:00Z`);
      const before = new Date(next.getTime() - 60_000);
      expect(periodStart("daily", before, BNE)).not.toBe(periodStart("daily", next, BNE));
    }
    expect(periodStart("daily", "2026-10-03T14:00:00Z", BNE)).toBe("2026-10-04");
    expect(periodStart("daily", "2027-04-03T14:00:00Z", BNE)).toBe("2027-04-04");
  });
  it("shift behaves as the local day", () => {
    expect(periodStart("shift", "2026-10-03T14:00:00Z", MEL)).toBe(periodStart("daily", "2026-10-03T14:00:00Z", MEL));
  });
  it("weekly starts on Monday, including across DST", () => {
    // Sunday 4 Oct 2026 (Melbourne) belongs to the week starting Monday 28 Sep
    expect(periodStart("weekly", "2026-10-04T00:00:00Z", MEL)).toBe("2026-09-28");
    // Monday 5 Oct 2026 starts a new week
    expect(periodStart("weekly", "2026-10-04T13:30:00Z", MEL)).toBe("2026-10-05");
    expect(previousPeriodStart("weekly", "2026-10-06T00:00:00Z", MEL)).toBe("2026-09-28");
    // across the autumn change
    expect(periodStart("weekly", "2027-04-04T05:00:00Z", MEL)).toBe("2027-03-29");
  });
  it("monthly and yearly boundaries follow local midnight", () => {
    expect(periodStart("monthly", "2026-10-31T12:30:00Z", MEL)).toBe("2026-10-01"); // 23:30 AEDT 31 Oct
    expect(periodStart("monthly", "2026-10-31T13:30:00Z", MEL)).toBe("2026-11-01"); // 00:30 AEDT 1 Nov
    expect(previousPeriodStart("monthly", "2026-01-15T00:00:00Z", MEL)).toBe("2025-12-01");
    expect(periodStart("annual", "2026-12-31T12:59:00Z", MEL)).toBe("2026-01-01"); // 23:59 AEDT
    expect(periodStart("annual", "2026-12-31T13:00:00Z", MEL)).toBe("2027-01-01");
    expect(previousPeriodStart("annual", "2027-02-01T00:00:00Z", MEL)).toBe("2026-01-01");
  });
  it("event has no period", () => {
    expect(periodStart("event", "2026-10-03T14:00:00Z", MEL)).toBe("event");
  });
});

describe("form status", () => {
  const live = new Date("2026-09-01T00:00:00Z");
  const base = { timeZone: MEL, activatedAt: live };
  it("done when there is a record in the current period", () => {
    const s = formStatus({ ...base, cadence: "daily", now: new Date("2026-10-06T03:00:00Z"), recordTimes: ["2026-10-05T23:30:00Z"] });
    expect(s.status).toBe("done"); // 10:30am on 6 Oct local
  });
  it("not started when today is empty and yesterday was done", () => {
    const s = formStatus({ ...base, cadence: "daily", now: new Date("2026-10-06T03:00:00Z"), recordTimes: ["2026-10-05T03:00:00Z"] });
    expect(s.status).toBe("not_started");
  });
  it("overdue when yesterday was missed and the form was already on", () => {
    const s = formStatus({ ...base, cadence: "daily", now: new Date("2026-10-06T03:00:00Z"), recordTimes: ["2026-10-01T03:00:00Z"] });
    expect(s.status).toBe("overdue");
    expect(s.reason).toBe("Not done yesterday");
  });
  it("never overdue for a period that began before the form was switched on", () => {
    const s = formStatus({ cadence: "daily", timeZone: MEL, now: new Date("2026-10-06T03:00:00Z"), recordTimes: [], activatedAt: new Date("2026-10-06T00:00:00Z") });
    expect(s.status).toBe("not_started");
  });
  it("same day overdue once the due hour passes (shift and daily only)", () => {
    const early = formStatus({ ...base, cadence: "shift", now: new Date("2026-10-05T22:00:00Z"), recordTimes: ["2026-10-04T22:00:00Z"], dueAfterHour: 11 });
    expect(early.status).toBe("not_started"); // 9am local
    const late = formStatus({ ...base, cadence: "shift", now: new Date("2026-10-06T02:00:00Z"), recordTimes: ["2026-10-04T22:00:00Z"], dueAfterHour: 11 });
    expect(late.status).toBe("overdue"); // 1pm local
    expect(late.reason).toBe("Due by 11am");
    const weekly = formStatus({ ...base, cadence: "weekly", now: new Date("2026-10-06T02:00:00Z"), recordTimes: ["2026-09-30T00:00:00Z"], dueAfterHour: 11 });
    expect(weekly.status).toBe("not_started");
  });
  it("weekly: done this week, overdue when last week was missed", () => {
    // Tuesday 6 Oct 2026 local
    const now = new Date("2026-10-06T02:00:00Z");
    expect(formStatus({ ...base, cadence: "weekly", now, recordTimes: ["2026-10-05T01:00:00Z"] }).status).toBe("done");
    expect(formStatus({ ...base, cadence: "weekly", now, recordTimes: ["2026-09-29T01:00:00Z"] }).status).toBe("not_started");
    const missed = formStatus({ ...base, cadence: "weekly", now, recordTimes: ["2026-09-15T01:00:00Z"] });
    expect(missed.status).toBe("overdue");
    expect(missed.reason).toBe("Not done last week");
  });
  it("monthly and yearly", () => {
    const now = new Date("2026-10-06T02:00:00Z");
    expect(formStatus({ ...base, cadence: "monthly", now, recordTimes: ["2026-10-01T01:00:00Z"] }).status).toBe("done");
    expect(formStatus({ ...base, activatedAt: new Date("2026-06-01T00:00:00Z"), cadence: "monthly", now, recordTimes: ["2026-08-01T01:00:00Z"] }).reason).toBe("Not done last month");
    expect(formStatus({ ...base, cadence: "annual", now, recordTimes: ["2025-06-01T01:00:00Z"] }).status).toBe("not_started"); // last year done
    // last year only counts as missed if the form was already on when it began
    expect(formStatus({ ...base, cadence: "annual", now, recordTimes: ["2024-06-01T01:00:00Z"] }).status).toBe("not_started");
    expect(formStatus({ ...base, activatedAt: new Date("2020-01-01T00:00:00Z"), cadence: "annual", now, recordTimes: ["2024-06-01T01:00:00Z"] }).status).toBe("overdue");
  });
  it("switching a form on late is never an instant overdue", () => {
    // switched on at 9pm local yesterday: this morning it is NOT overdue for yesterday
    const onAt = new Date("2026-10-05T10:00:00Z"); // 9pm 5 Oct local (AEDT)
    const morning = new Date("2026-10-05T23:30:00Z"); // 10:30am 6 Oct local
    expect(formStatus({ cadence: "daily", timeZone: MEL, now: morning, recordTimes: [], activatedAt: onAt }).status).toBe("not_started");
    // the day after that it is overdue for the full day that was missed
    const next = new Date("2026-10-06T23:30:00Z");
    expect(formStatus({ cadence: "daily", timeZone: MEL, now: next, recordTimes: [], activatedAt: onAt }).status).toBe("overdue");
    // switched on at 3pm today, a form due by 11am is not overdue today
    const threePm = new Date("2026-10-06T04:00:00Z"); // 3pm 6 Oct local
    const evening = new Date("2026-10-06T08:00:00Z"); // 7pm 6 Oct local
    expect(formStatus({ cadence: "shift", timeZone: MEL, now: evening, recordTimes: [], activatedAt: threePm, dueAfterHour: 11 }).status).toBe("not_started");
    // switched on at 8am, due by 11am: overdue at 1pm
    const eightAm = new Date("2026-10-05T21:00:00Z"); // 8am 6 Oct local
    const onePm = new Date("2026-10-06T02:00:00Z");
    expect(formStatus({ cadence: "shift", timeZone: MEL, now: onePm, recordTimes: [], activatedAt: eightAm, dueAfterHour: 11 }).status).toBe("overdue");
  });
  it("event forms are never due and report the last record", () => {
    const s = formStatus({ ...base, cadence: "event", now: new Date("2026-10-06T02:00:00Z"), recordTimes: ["2026-10-01T01:00:00Z", "2026-10-03T01:00:00Z"] });
    expect(s.status).toBe("event");
    expect(s.lastAt).toBe("2026-10-03T01:00:00Z");
  });
  it("the engine live date stops a brand new hub showing everything overdue", () => {
    const live2 = activatedAt(undefined, "2026-08-01T00:00:00Z");
    expect(live2.toISOString()).toBe(new Date(ENGINE_LIVE_FROM).toISOString());
    const s = formStatus({ cadence: "daily", timeZone: MEL, now: new Date("2026-10-04T03:00:00Z"), recordTimes: [], activatedAt: live2 });
    expect(s.status).toBe("not_started");
  });
});

describe("rule compiler and mirror", () => {
  it("compiles a simple form", () => {
    const r = compileRules(FORM_BY_ID.B5);
    expect(r.version).toBe(1);
    expect(r.event).toBe(true);
    expect(r.cosign).toBe(false);
    expect(r.fail).toEqual([{ field: "core_temp_c", op: "lt", label: "Below 75°C (Larder default, review before use)", value: 75 }]);
  });
  it("compiles stages, subject and cosign", () => {
    const six = compileRules(FORM_BY_ID.B6, { stageKey: "six_hour" });
    expect(six.stage).toMatchObject({ key: "six_hour", chain: "existing", requires: "start", soft_prior: ["two_hour"], elapsed_max_min: 360 });
    expect(six.allow_correction).toBe(false);
    expect(compileRules(FORM_BY_ID.B6, { stageKey: "start" }).stage).toMatchObject({ chain: "new" });
    expect(compileRules(FORM_BY_ID.B4).subject).toEqual({ field: "thermometer" });
    // the hard field bounds are wide enough to SAVE a failing reading instead of refusing it
    const b4 = compileRules(FORM_BY_ID.B4).fields as { key: string; min: number; max: number }[];
    expect(b4.find((f) => f.key === "ice_c")).toMatchObject({ min: -30, max: 60 });
    expect(b4.find((f) => f.key === "boil_c")).toMatchObject({ min: 40, max: 120 });
    const b5 = compileRules(FORM_BY_ID.B5).fields as { key: string; min: number }[];
    expect(b5.find((f) => f.key === "core_temp_c")?.min).toBe(-30);
    expect(compileRules(FORM_BY_ID.F3).cosign).toBe(true);
  });
  it("B6 6 hour check: a missed 2 hour check is a soft prior, not a block", () => {
    const six = compileRules(FORM_BY_ID.B6, { stageKey: "six_hour" });
    expect(six.stage).toMatchObject({ soft_prior: ["two_hour"], soft_prior_label: "The 2 hour check was missed" });
    expect(six.stage).not.toHaveProperty("requires_prior");
  });
  it("an unknown stage is an error", () => {
    expect(() => compileRules(FORM_BY_ID.B6, { stageKey: "nope" })).toThrow();
    expect(findStage(FORM_BY_ID.B6, undefined)?.key).toBe("start");
  });
  it("checklist items: stations first, then the fixed items", () => {
    const r = compileRules(FORM_BY_ID.B9, { stationItems: { items: [{ key: "station_1", label: "Clean and sanitise: Pizza oven" }] } });
    const f = (r.fields as { items: { key: string }[] }[])[0];
    expect(f.items[0].key).toBe("station_1");
    expect(f.items.length).toBe(7);
  });
  it("B3 receiving: each temperature type has its own limit", () => {
    const fail = FORM_BY_ID.B3.fail;
    const run = (v: Record<string, string | number>) => evaluateFail(fail, { packaging: "pass", dates: "pass", decision: "accepted", ...v });
    expect(run({ temp_type: "chilled", temp_c: 5 })).toEqual([]);
    expect(run({ temp_type: "chilled", temp_c: 5.1 })).toHaveLength(1);
    expect(run({ temp_type: "frozen", temp_c: -15 })).toEqual([]);
    expect(run({ temp_type: "frozen", temp_c: -14.9 })).toHaveLength(1);
    expect(run({ temp_type: "hot", temp_c: 60 })).toEqual([]);
    expect(run({ temp_type: "hot", temp_c: 59.9 })).toHaveLength(1);
    expect(run({ temp_type: "chilled", temp_c: 3, decision: "rejected" })).toEqual(["Delivery rejected"]);
    expect(run({ temp_type: "chilled", temp_c: 3, packaging: "fail", dates: "fail" })).toHaveLength(2);
  });
  it("B4 thermometer: boundaries at minus 1, 1, 99 and 101", () => {
    const fail = FORM_BY_ID.B4.fail;
    expect(evaluateFail(fail, { ice_c: -1, boil_c: 99 })).toEqual([]);
    expect(evaluateFail(fail, { ice_c: 1, boil_c: 101 })).toEqual([]);
    expect(evaluateFail(fail, { ice_c: -1.1, boil_c: 100 })).toHaveLength(1);
    expect(evaluateFail(fail, { ice_c: 0, boil_c: 101.1 })).toHaveLength(1);
  });
  it("B5 and B7 boundary: 75 passes, 74.9 fails", () => {
    expect(evaluateFail(FORM_BY_ID.B5.fail, { core_temp_c: 75 })).toEqual([]);
    expect(evaluateFail(FORM_BY_ID.B5.fail, { core_temp_c: 74.9 })).toHaveLength(1);
    expect(evaluateFail(FORM_BY_ID.B7.fail, { core_temp_c: 74.9 })).toHaveLength(1);
  });
  it("B6 cooling stages: 21 and 5 are in range, above fails", () => {
    const two = findStage(FORM_BY_ID.B6, "two_hour")!.fail;
    const six = findStage(FORM_BY_ID.B6, "six_hour")!.fail;
    expect(evaluateFail(two, { temp_c: 21 })).toEqual([]);
    expect(evaluateFail(two, { temp_c: 21.1 })).toHaveLength(1);
    expect(evaluateFail(six, { temp_c: 5 })).toEqual([]);
    expect(evaluateFail(six, { temp_c: 5.1 })).toHaveLength(1);
  });
  it("checklist any fail, pass or fail eq, differs tolerance", () => {
    expect(evaluateFail(FORM_BY_ID.B10.fail, { items: { handwash: "pass", sanitiser: "na" } })).toEqual([]);
    expect(evaluateFail(FORM_BY_ID.B10.fail, { items: { handwash: "pass", sanitiser: "fail" } })).toHaveLength(1);
    expect(evaluateFail(FORM_BY_ID.F3.fail, { expected_cash: 500, counted_cash: 495 })).toEqual([]);
    expect(evaluateFail(FORM_BY_ID.F3.fail, { expected_cash: 500, counted_cash: 494.99 })).toHaveLength(1);
    expect(evaluateFail(FORM_BY_ID.F3.fail, { expected_cash: 500, counted_cash: 505.01 })).toHaveLength(1);
    expect(evaluateFail(FORM_BY_ID.BAR2.fail, { temps_ok: "pass", chemicals_ok: "fail", filter_ok: "pass" })).toHaveLength(1);
  });
  it("cafe display cabinet: cold and hot judged separately", () => {
    const fail = FORM_BY_ID.CAFE1.fail;
    expect(evaluateFail(fail, { mode: "cold", temp_c: 5 })).toEqual([]);
    expect(evaluateFail(fail, { mode: "cold", temp_c: 5.1 })).toHaveLength(1);
    expect(evaluateFail(fail, { mode: "hot", temp_c: 60 })).toEqual([]);
    expect(evaluateFail(fail, { mode: "hot", temp_c: 59.9 })).toHaveLength(1);
    expect(evaluateFail(fail, { mode: "cold", temp_c: 70 })).toHaveLength(1); // hot rule never applies to cold
  });
});

function allFields(def: FormDef): FieldDef[] {
  return [...def.fields, ...(def.stages ?? []).flatMap((s) => s.fields)];
}

function strings(def: FormDef): string[] {
  const out: string[] = [def.title, def.summary, def.cadenceNote, def.tagNote, def.failBehaviour, def.defaultOnNote];
  if (def.ruleTag) out.push(def.ruleTag.text);
  for (const f of allFields(def)) {
    out.push(f.label);
    if (f.hint) out.push(f.hint);
    if (f.type === "choice") f.options.forEach((o) => out.push(o.label));
    if (f.type === "checklist") f.items.forEach((i) => out.push(i.label));
    if (f.type === "passfail") out.push(f.passLabel ?? "", f.failLabel ?? "");
  }
  for (const r of [...def.fail, ...(def.stages ?? []).flatMap((s) => s.fail)]) out.push(r.label);
  for (const s of def.stages ?? []) out.push(s.label, s.blurb, s.elapsedLabel ?? "");
  return out;
}

describe("catalog integrity", () => {
  it("ids are unique and database safe", () => {
    const ids = FORMS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9_]{1,40}$/);
    expect(ids).not.toContain("B2");
  });
  it("field keys are unique per form or stage and database safe", () => {
    for (const def of FORMS) {
      const sets = def.stages ? def.stages.map((s) => s.fields) : [def.fields];
      for (const fields of sets) {
        const keys = fields.map((f) => f.key);
        expect(new Set(keys).size, def.id).toBe(keys.length);
        for (const k of keys) expect(k, def.id).toMatch(/^[a-z][a-z0-9_]{0,40}$/);
      }
    }
  });
  it("every fail rule names a field that exists, and every checklist and pass or fail field can fail", () => {
    for (const def of FORMS) {
      const sets = def.stages ? def.stages.map((s) => ({ fields: s.fields, fail: s.fail })) : [{ fields: def.fields, fail: def.fail }];
      for (const { fields, fail } of sets) {
        const keys = new Set(fields.map((f) => f.key));
        for (const r of fail) {
          expect(keys.has(r.field), `${def.id} ${r.field}`).toBe(true);
          if (r.when) expect(keys.has(r.when.field), `${def.id} when ${r.when.field}`).toBe(true);
          if (r.other) expect(keys.has(r.other), `${def.id} other ${r.other}`).toBe(true);
        }
        for (const f of fields) {
          if (f.type === "checklist") expect(fail.some((r) => r.field === f.key && r.op === "any_fail"), `${def.id} ${f.key}`).toBe(true);
          if (f.type === "passfail") expect(fail.some((r) => r.field === f.key && r.op === "eq" && r.value === "fail"), `${def.id} ${f.key}`).toBe(true);
        }
      }
    }
  });
  it("no copy uses a hyphen, en dash or em dash", () => {
    for (const def of FORMS) {
      for (const s of strings(def)) {
        expect(s, `${def.id}: ${s}`).not.toMatch(/[-–—]/);
      }
    }
    for (const h of HELD_FORMS) expect(h.reason).not.toMatch(/[-–—]/);
  });
  it("only a source verified claim may say Legally required or Required if", () => {
    for (const def of FORMS) {
      if (def.tag !== "recommended") expect(def.tagVerified, def.id).toBe(true);
      if (def.tagVerified) expect(def.tag, def.id).not.toBe("recommended");
    }
    expect(FORMS.filter((f) => f.tag !== "recommended").map((f) => f.id)).toEqual(["B13"]);
    expect(FORMS.filter((f) => f.ruleTag).map((f) => f.id).sort()).toEqual(["B3", "B4", "B6", "B7", "CAFE1"]);
  });
  it("retention and frequency are never called a legal minimum or a legal requirement", () => {
    for (const def of FORMS) {
      for (const s of [def.cadenceNote, def.tagNote].join(" ")) {
        void s;
      }
      expect(def.cadenceNote.toLowerCase(), def.id).not.toMatch(/legal(ly)? (minimum|required)|by law/);
      expect(def.tagNote.toLowerCase(), def.id).not.toMatch(/retention|years? of records/);
    }
  });
  it("default lists carry the review flag; stages belong to event forms; due hours only on shift or daily", () => {
    for (const def of FORMS) {
      if (def.fields.some((f) => f.type === "checklist")) expect(def.defaultList, def.id).toBe(true);
      if (def.stages) expect(def.cadence, def.id).toBe("event");
      if (def.dueAfterHour !== undefined) expect(["shift", "daily"], def.id).toContain(def.cadence);
      expect(def.estMinutes).toBeGreaterThan(0);
    }
  });
  it("forms that cannot be corrected say so, and stage forms take no corrections", () => {
    for (const def of FORMS) if (def.stages) expect(def.allowCorrection, def.id).toBe(false);
  });
  it("the held list names every held form once", () => {
    expect(HELD_FORMS.map((h) => h.id)).toEqual(["B16", "F4", "F5", "F6T", "F12", "F11", "B21", "RES", "RSG"]);
  });
});

describe("activation defaults and access", () => {
  const pub: ActivationContext = { foodService: "full_kitchen", licenceType: "general", offersAccommodation: false, tradeWaste: "yes", highRiskActivities: [] };
  const barOnly: ActivationContext = { foodService: "no_food_service", licenceType: "on_premises", offersAccommodation: false, tradeWaste: "no", highRiskActivities: [] };
  const lowRisk: ActivationContext = { ...pub, foodService: "bar_snacks_low_risk", tradeWaste: "unsure" };
  const unknown: ActivationContext = { ...pub, foodService: null, licenceType: null, tradeWaste: "unsure" };
  it("a pub with a full kitchen and a trade waste agreement turns on the food, bar and grease trap forms", () => {
    for (const id of ["B3", "B5", "B6", "B9", "B10", "B13", "BAR1", "BAR2", "BAR3", "F10", "F7", "F1", "F3"]) expect(isFormOn(FORM_BY_ID[id], undefined, pub), id).toBe(true);
    for (const id of ["CAFE1", "CAFE2", "CAFE3"]) expect(isFormOn(FORM_BY_ID[id], undefined, pub), id).toBe(false);
  });
  it("a bar with no food service has no kitchen forms", () => {
    for (const id of ["B3", "B5", "B6", "B7", "B8", "B9", "B10", "B11", "B12", "B13", "B17", "B1", "B20", "F7"]) expect(isFormOn(FORM_BY_ID[id], undefined, barOnly), id).toBe(false);
    for (const id of ["BAR1", "F10", "F1", "F2", "F3", "F6", "F8"]) expect(isFormOn(FORM_BY_ID[id], undefined, barOnly), id).toBe(true);
  });
  it("low risk food turns on cleaning and records but not the cooking controls", () => {
    expect(isFormOn(FORM_BY_ID.B9, undefined, lowRisk)).toBe(true);
    expect(isFormOn(FORM_BY_ID.B6, undefined, lowRisk)).toBe(false);
    expect(isFormOn(FORM_BY_ID.B13, undefined, lowRisk)).toBe(false);
  });
  it("unknown food service is treated as a full kitchen, unknown licence as no bar", () => {
    expect(isFormOn(FORM_BY_ID.B6, undefined, unknown)).toBe(true);
    expect(isFormOn(FORM_BY_ID.BAR1, undefined, unknown)).toBe(false);
  });
  it("an explicit owner choice beats the default both ways", () => {
    const row = (enabled: boolean) => ({ form_id: "B13", enabled, enabled_at: "2026-10-04T00:00:00Z" });
    expect(isFormOn(FORM_BY_ID.B13, row(false), pub)).toBe(false);
    expect(isFormOn(FORM_BY_ID.B13, row(true), barOnly)).toBe(true);
  });
  it("who may open and fill", () => {
    const boh = { isManagerTier: false, department: "BOH" };
    const foh = { isManagerTier: false, department: "FOH" };
    const none = { isManagerTier: false, department: null };
    const mgr = { isManagerTier: true, department: "FOH" };
    expect(canOpenForm(FORM_BY_ID.B5, boh)).toBe(true);
    expect(canOpenForm(FORM_BY_ID.B5, foh)).toBe(false);
    expect(canOpenForm(FORM_BY_ID.B5, none)).toBe(false);
    expect(canOpenForm(FORM_BY_ID.B5, mgr)).toBe(true);
    expect(canOpenForm(FORM_BY_ID.F7, foh)).toBe(true);
    expect(canOpenForm(FORM_BY_ID.F7, boh)).toBe(true);
    const ticket = findStage(FORM_BY_ID.F7, "ticket")!;
    const confirm = findStage(FORM_BY_ID.F7, "confirm")!;
    expect(canFillStage(FORM_BY_ID.F7, ticket, foh)).toBe(true);
    expect(canFillStage(FORM_BY_ID.F7, ticket, boh)).toBe(false);
    expect(canFillStage(FORM_BY_ID.F7, confirm, boh)).toBe(true);
    expect(canFillStage(FORM_BY_ID.F7, confirm, foh)).toBe(false);
    expect(canFillStage(FORM_BY_ID.F7, confirm, mgr)).toBe(true);
    expect(gateRoles(FORM_BY_ID.F7, confirm)).toEqual(["BOH"]);
    expect(visibleRoles(FORM_BY_ID.F7)).toEqual(["FOH", "BOH"]);
    expect(visibleRoles(FORM_BY_ID.B5)).toEqual(["BOH"]);
  });
});

describe("generic number input", () => {
  it("has no temperature range and accepts comma and minus variants", () => {
    expect(parseNumberInput("500")).toBe(500);
    expect(parseNumberInput("1234.5")).toBe(1234.5);
    expect(parseNumberInput("12,5")).toBe(12.5);
    expect(parseNumberInput("−18")).toBe(-18);
    expect(parseNumberInput("-3.5")).toBe(-3.5);
  });
  it("rejects text and half typed numbers", () => {
    for (const bad of ["", "-", ".", "abc", "1.2.3", "12abc", " "]) expect(parseNumberInput(bad), bad).toBeNull();
  });
});
