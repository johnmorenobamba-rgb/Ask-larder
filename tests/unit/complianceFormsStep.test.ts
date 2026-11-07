import { describe, expect, it } from "vitest";
import { buildActivationGroups, countFormsOn, missingActivationAnswers } from "../../src/lib/compliance/engine/activationGroups";
import { FORMS } from "../../src/lib/compliance/engine/forms";
import type { ActivationRow } from "../../src/lib/compliance/engine/activation";
import type { ActivationContext } from "../../src/lib/compliance/engine/types";
import { WIZARD_STEP_SLUGS, WIZARD_STEPS, getNextStep, getPreviousStep } from "../../src/lib/onboarding/steps";

const pub: ActivationContext = {
  foodService: "full_kitchen",
  licenceType: "general",
  offersAccommodation: false,
  tradeWaste: "yes",
  highRiskActivities: [],
  venueType: "pub",
};

const ids = (groups: ReturnType<typeof buildActivationGroups>, on: boolean) =>
  groups.flatMap((g) => g.items).filter((i) => i.on === on).map((i) => i.id).sort();

describe("compliance forms step: activation groups", () => {
  it("lists every generic form exactly once", () => {
    const listed = buildActivationGroups(new Map(), pub).flatMap((g) => g.items.map((i) => i.id));
    expect(listed.sort()).toEqual(FORMS.map((f) => f.id).sort());
  });

  it("a pub with a full kitchen and trade waste has everything on except the cafe pack", () => {
    const groups = buildActivationGroups(new Map(), pub);
    expect(ids(groups, false)).toEqual(["CAFE1", "CAFE2", "CAFE3"]);
    expect(countFormsOn(new Map(), pub)).toBe(FORMS.length - 3);
  });

  it("an owner's switch beats the default and says so", () => {
    const rows = new Map<string, ActivationRow>([
      ["CAFE2", { form_id: "CAFE2", enabled: true, enabled_at: "2026-11-01T00:00:00Z" }],
      ["F13", { form_id: "F13", enabled: false, enabled_at: "2026-11-01T00:00:00Z" }],
    ]);
    const items = buildActivationGroups(rows, pub).flatMap((g) => g.items);
    expect(items.find((i) => i.id === "CAFE2")).toMatchObject({ on: true, reason: "Switched on by the owner" });
    expect(items.find((i) => i.id === "F13")).toMatchObject({ on: false, reason: "Switched off by the owner" });
  });

  it("a cafe with no food service has no kitchen forms but keeps the cafe pack", () => {
    const cafe: ActivationContext = { ...pub, foodService: "no_food_service", licenceType: null, tradeWaste: "no", venueType: "cafe" };
    const on = ids(buildActivationGroups(new Map(), cafe), true);
    expect(on).toContain("CAFE1");
    expect(on).not.toContain("B10");
    expect(on).not.toContain("BAR1");
    expect(on).not.toContain("B13");
  });
});

describe("compliance forms step: missing answers", () => {
  it("flags nothing when every answer is in", () => {
    expect(missingActivationAnswers(pub)).toEqual([]);
  });
  it("flags venue type, food service and an unsure trade waste answer", () => {
    const steps = missingActivationAnswers({ ...pub, venueType: null, foodService: null, tradeWaste: "unsure" }).map((m) => m.step);
    expect(steps).toEqual(["compliance-setup", "food-service", "compliance-setup"]);
  });
});

describe("compliance forms step: wizard order", () => {
  it("sits between certificate types and review in both directions", () => {
    for (const flags of [{}, { licensed: false }]) {
      expect(getNextStep("certificate-types", flags)).toBe("compliance-forms");
      expect(getNextStep("compliance-forms", flags)).toBe("review");
      expect(getPreviousStep("review", flags)).toBe("compliance-forms");
      expect(getPreviousStep("compliance-forms", flags)).toBe("certificate-types");
    }
  });
  it("is listed in the step rail", () => {
    expect(WIZARD_STEP_SLUGS).toContain("compliance-forms");
    expect(WIZARD_STEPS.map((s) => s.slug)).toEqual([...WIZARD_STEP_SLUGS]);
  });
});
