import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PassSlide } from "@/components/staff/PassSlide";
import { TemperatureLogForm, type UnitGroup } from "@/components/staff/TemperatureLogForm";
import { COMPLIANCE_FORMS, STATUS_TAG_LABELS, canSubmitForm } from "@/lib/compliance/catalog";
import { getStaffDepartment, loadB2Overview } from "@/lib/compliance/b2Data";
import {
  UNIT_TYPE_HEADINGS,
  UNIT_TYPE_ORDER,
  describeLimitSentence,
  formatLocalDateTime,
  formatLocalTime,
  limitFor,
} from "@/lib/compliance/b2";

export const dynamic = "force-dynamic";

// B2 storage temperature log, staff side. Visible to BOH staff plus manager tier
// and owners (catalog); everyone else is sent home.
export default async function TemperaturePage({ params }: { params: Promise<{ venueSlug: string }> }) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  if (!staff) redirect(`/${venueSlug}/login`);
  if (!staff.staff_role_id && !staff.isManagerTier) redirect(`/${venueSlug}/roles`);

  const supabase = await createClient();
  const form = COMPLIANCE_FORMS.B2;
  const dept = await getStaffDepartment(supabase, staff.staff_role_id);
  // a failed role lookup must not look like "your role can't log this"
  if (dept.ok && !canSubmitForm(form, { isManagerTier: staff.isManagerTier, department: dept.department })) redirect(`/${venueSlug}/home`);

  const now = new Date();
  const overview = await loadB2Overview(supabase, staff.venue_id!, now);
  const tz = overview.timeZone;

  const groups: UnitGroup[] = UNIT_TYPE_ORDER.map((type) => ({
    type,
    heading: UNIT_TYPE_HEADINGS[type],
    tagLabel: STATUS_TAG_LABELS[form.limits[type].tag],
    basis: form.limits[type].basis,
    units: overview.statuses
      .filter((s) => s.unit.unit_type === type && limitFor(s.unit))
      .map((s) => {
        const l = limitFor(s.unit)!;
        const todayLatest = s.doneToday && s.latest ? s.latest : null;
        return {
          unitId: s.unit.id,
          name: s.unit.name,
          unitType: type,
          limitKind: l.kind,
          limitC: l.limitC,
          minC: s.unit.min_temp_c,
          maxC: s.unit.max_temp_c,
          limitText: describeLimitSentence(s.unit),
          latest: todayLatest
            ? {
                id: todayLatest.id,
                readingC: s.readingC,
                outOfRange: todayLatest.out_of_range,
                note: todayLatest.corrective_action,
                time: formatLocalTime(todayLatest.submitted_at, tz),
                by: todayLatest.submitted_by_name,
              }
            : null,
          prior:
            !todayLatest && s.latest
              ? {
                  time: formatLocalDateTime(s.latest.submitted_at, tz),
                  readingC: s.readingC,
                  outOfRange: s.latest.out_of_range,
                }
              : null,
          earlier: overview.todays
            .filter((r) => r.unitId === s.unit.id && !r.isLatestForUnit)
            .map((r) => ({
              id: r.id,
              readingC: r.readingC,
              outOfRange: r.outOfRange,
              time: formatLocalTime(r.submittedAt, tz),
              by: r.submittedByName,
            })),
        };
      }),
  })).filter((g) => g.units.length > 0);

  const degraded = overview.degraded || !dept.ok;
  const { total, doneToday, openFlags } = overview.summary;
  const dateLabel = new Intl.DateTimeFormat("en-AU", { timeZone: tz, weekday: "long", day: "numeric", month: "long" }).format(now);

  return (
    <main className="min-h-screen bg-parchment px-6 pb-44 pt-24">
      <PassSlide>
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <div className="space-y-1">
            <h1 className="font-display text-3xl font-bold text-ink">Temperature log</h1>
            <p className="font-sans text-base text-ink/70">
              {dateLabel}.{" "}
              {degraded ? "" : total === 0 ? "No units set up yet." : `${doneToday} of ${total} units logged today.`}
              {!degraded && openFlags > 0 ? ` ${openFlags === 1 ? "1 unit is" : `${openFlags} units are`} still out of range.` : ""}
            </p>
            <p className="font-sans text-sm text-ink/70">{form.frequency.note}</p>
          </div>
          {degraded && (
            <p role="alert" className="rounded-2xl border-2 border-preserve-red px-4 py-3 font-sans text-base text-preserve-red">
              Couldn&apos;t load today&apos;s readings. What you see here may be incomplete. Reload the page to try again.
            </p>
          )}
          <TemperatureLogForm groups={groups} canSetUp={staff.isManagerTier} setupHref={`/${venueSlug}/owner/onboarding/compliance-setup`} />
          <p className="font-sans text-sm text-ink/70">{form.retentionNote}</p>
        </div>
      </PassSlide>
    </main>
  );
}
