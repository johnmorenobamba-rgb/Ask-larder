import type { Department } from "../catalog";
import type { ActivationContext, FormDef, StageDef } from "./types";

// Which forms a venue has switched on, and who may fill them. Pure and unit tested.
//
// A form is ON when the venue has an explicit row (enabled true) or, with no row, when its default for
// this venue's settings says so. A venue with an explicit row (enabled false) has it OFF. The default
// is derived from what the wizard captured: food service level, licence type, accommodation, Trade
// Waste Agreement and high risk activities. The owner overrides any default on the forms page.

export type ActivationRow = { form_id: string; enabled: boolean; enabled_at: string };

/** The date the engine went live. A form is never treated as overdue for a period that began before it. */
export const ENGINE_LIVE_FROM = "2026-10-03T14:00:00Z";

export function isFormOn(def: FormDef, row: ActivationRow | undefined, ctx: ActivationContext): boolean {
  if (row) return row.enabled;
  return def.defaultOn(ctx);
}

/** Why the form is in its current state, for the owner page. */
export function activationReason(def: FormDef, row: ActivationRow | undefined, ctx: ActivationContext): string {
  if (row) return row.enabled ? "Switched on by the owner" : "Switched off by the owner";
  return def.defaultOn(ctx) ? `On by default. ${def.defaultOnNote}` : `Off by default. ${def.defaultOnNote}`;
}

/** When the form started counting for overdue purposes. */
export function activatedAt(row: ActivationRow | undefined, settingsCreatedAt: string | null | undefined): Date {
  const live = new Date(ENGINE_LIVE_FROM).getTime();
  const candidates = [live];
  const base = row?.enabled_at ?? settingsCreatedAt;
  if (base) candidates.push(new Date(base).getTime());
  return new Date(Math.max(...candidates));
}

export type Who = { isManagerTier: boolean; department: string | null | undefined };

/** Departments allowed to open a form (any stage). Manager tier and owners always can. */
export function canOpenForm(def: FormDef, who: Who): boolean {
  if (who.isManagerTier) return true;
  return !!who.department && (def.departments as readonly string[]).includes(who.department);
}

export function canFillStage(def: FormDef, stage: StageDef | null, who: Who): boolean {
  if (who.isManagerTier) return true;
  const allowed: readonly Department[] = stage ? stage.departments : def.departments;
  return !!who.department && (allowed as readonly string[]).includes(who.department);
}

/** Gate roles for the database call: who may submit this form or stage. */
export function gateRoles(def: FormDef, stage: StageDef | null): Department[] {
  return [...(stage ? stage.departments : def.departments)];
}

/** Audience stored on the record (who can read it later). */
export function visibleRoles(def: FormDef): Department[] {
  return [...(def.visibleTo ?? def.departments)];
}
