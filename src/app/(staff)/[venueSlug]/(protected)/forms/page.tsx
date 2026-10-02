import Link from "next/link";
import { resolveNow } from "@/lib/compliance/engine/testClock";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PassSlide } from "@/components/staff/PassSlide";
import { getStaffDepartment } from "@/lib/compliance/b2Data";
import { groupHubByCadence, loadHub, type HubForm } from "@/lib/compliance/engine/hubData";
import { CADENCE_HEADINGS, FORM_TAG_LABELS } from "@/lib/compliance/engine/types";
import { formatHour } from "@/lib/compliance/engine/due";

export const dynamic = "force-dynamic";

// Staff hub: the venue's compliance forms by cadence with Not started, Done and Overdue states in venue
// local time. Overdue is shown here on screen only; nothing is emailed or pushed. A person sees the forms
// their role fills (manager tier and owners see every form that is switched on).
export default async function FormsHubPage({ params, searchParams }: { params: Promise<{ venueSlug: string }>; searchParams: Promise<{ asof?: string }> }) {
  const { venueSlug } = await params;
  const sp = await searchParams;
  const staff = await getCurrentStaff();
  if (!staff) redirect(`/${venueSlug}/login`);
  if (!staff.staff_role_id && !staff.isManagerTier) redirect(`/${venueSlug}/roles`);

  const supabase = await createClient();
  const dept = await getStaffDepartment(supabase, staff.staff_role_id);
  const who = { isManagerTier: staff.isManagerTier, department: dept.department };
  const now = resolveNow(sp.asof);
  const hub = await loadHub(supabase, createAdminClient(), staff.venue_id!, who, now);
  const degraded = hub.degraded || !dept.ok;

  const shown = hub.forms.filter((f) => f.on && f.canFill);
  const groups = groupHubByCadence(shown);
  const overdue = shown.filter((f) => f.status.status === "overdue").length;
  const todo = shown.filter((f) => f.status.status === "not_started" || f.status.status === "overdue").length;
  const dateLabel = new Intl.DateTimeFormat("en-AU", { timeZone: hub.timeZone, weekday: "long", day: "numeric", month: "long" }).format(now);

  return (
    <main className="min-h-screen bg-parchment px-6 pb-24 pt-24">
      <PassSlide>
        <div className="mx-auto w-full max-w-3xl space-y-8">
          <div className="space-y-1">
            <h1 className="font-display text-3xl font-bold text-ink">Compliance forms</h1>
            <p className="font-sans text-base text-ink/70">
              {dateLabel}.{" "}
              {degraded ? "" : todo === 0 ? "Nothing to do right now." : `${todo} to do${overdue > 0 ? `, ${overdue} overdue` : ""}.`}
            </p>
            <p className="font-sans text-sm text-ink/70">
              Overdue is shown here on screen only. Nothing is emailed or sent to your phone.
            </p>
          </div>

          {degraded && (
            <p role="alert" className="rounded-2xl border-2 border-preserve-red px-4 py-3 font-sans text-base text-preserve-red">
              Couldn&apos;t load every form. What you see here may be incomplete. Reload the page to try again.
            </p>
          )}

          {groups.length === 0 && !(hub.b2.on && hub.b2.canFill) && (
            <p className="rounded-2xl border-2 border-clay-brown px-4 py-4 font-sans text-base text-ink">
              No forms are switched on for your role yet. Ask your manager to switch some on.
            </p>
          )}

          {renderGroups(groups, venueSlug, hub.b2)}

          {staff.isManagerTier && (
            <p className="font-sans text-sm text-ink/70">
              Manager tools: <Link className="font-medium underline" href={`/${venueSlug}/owner/forms`}>switch forms on or off</Link> and{" "}
              <Link className="font-medium underline" href={`/${venueSlug}/owner/compliance`}>see the compliance overview</Link>.
            </p>
          )}
        </div>
      </PassSlide>
    </main>
  );
}

function StatusChip({ f }: { f: HubForm }) {
  const s = f.status;
  if (s.status === "event") {
    const recent = f.recentFails > 0 ? `${f.recentFails} failed in the last 7 days` : "Log it when it happens";
    return <span className={`font-sans text-sm ${f.recentFails > 0 ? "font-medium text-preserve-red" : "text-ink/70"}`}>{recent}</span>;
  }
  if (s.status === "done") return <span className="rounded-full bg-bay-green/15 px-3 py-1 font-mono text-xs uppercase tracking-wide text-bay-green">Done</span>;
  if (s.status === "overdue") return <span className="rounded-full bg-preserve-red px-3 py-1 font-mono text-xs uppercase tracking-wide text-parchment">Overdue</span>;
  return <span className="rounded-full border border-clay-brown px-3 py-1 font-mono text-xs uppercase tracking-wide text-clay-brown">Not started</span>;
}

function renderGroups(groups: ReturnType<typeof groupHubByCadence>, venueSlug: string, b2: { on: boolean; canFill: boolean; total: number; doneToday: number; openFlags: number }) {
  const b2Card = b2.on && b2.canFill && b2.total > 0;
  const withB2 = groups.some((g) => g.cadence === "daily") ? groups : [{ cadence: "daily" as const, forms: [] as HubForm[] }, ...groups];
  return (
    <div className="space-y-8">
      {withB2
        .sort((a, b) => ["shift", "daily", "weekly", "monthly", "annual", "event"].indexOf(a.cadence) - ["shift", "daily", "weekly", "monthly", "annual", "event"].indexOf(b.cadence))
        .filter((g) => g.forms.length > 0 || (g.cadence === "daily" && b2Card))
        .map((g) => (
          <section key={g.cadence} aria-labelledby={`cad-${g.cadence}`} className="space-y-3">
            <h2 id={`cad-${g.cadence}`} className="font-display text-xl font-bold text-ink">
              {CADENCE_HEADINGS[g.cadence]}
            </h2>
            <ul className="grid items-stretch gap-3 md:grid-cols-2">
              {g.cadence === "daily" && b2Card && (
                <li className={`rounded-2xl border-2 ${b2.openFlags > 0 ? "border-preserve-red" : b2.doneToday >= b2.total ? "border-bay-green" : "border-clay-brown"}`}>
                  <Link href={`/${venueSlug}/temperature`} className="flex h-full min-h-28 flex-col justify-between gap-2 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-sans text-lg font-medium text-ink">Temperature log</p>
                      {b2.doneToday >= b2.total ? (
                        <span className="rounded-full bg-bay-green/15 px-3 py-1 font-mono text-xs uppercase tracking-wide text-bay-green">Done</span>
                      ) : (
                        <span className="rounded-full border border-clay-brown px-3 py-1 font-mono text-xs uppercase tracking-wide text-clay-brown">Not started</span>
                      )}
                    </div>
                    <p className="font-sans text-sm text-ink/80">
                      {b2.doneToday} of {b2.total} units logged today.{b2.openFlags > 0 ? ` ${b2.openFlags} out of range.` : ""}
                    </p>
                  </Link>
                </li>
              )}
              {g.forms.map((f) => (
                <li
                  key={f.def.id}
                  className={`rounded-2xl border-2 ${f.status.status === "overdue" || f.openFlags > 0 ? "border-preserve-red" : f.status.status === "done" ? "border-bay-green" : "border-clay-brown"}`}
                >
                  <Link href={`/${venueSlug}/forms/${f.def.id}`} className="flex h-full min-h-28 flex-col justify-between gap-2 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-sans text-lg font-medium text-ink">{f.def.title}</p>
                      <StatusChip f={f} />
                    </div>
                    <div className="space-y-1">
                      {f.status.reason && <p className="font-sans text-sm font-medium text-preserve-red">{f.status.reason}</p>}
                      {f.openFlags > 0 && <p className="font-sans text-sm font-medium text-preserve-red">Failed and not yet fine again</p>}
                      {f.openChains > 0 && (
                        <p className="font-sans text-sm font-medium text-ink">
                          {f.openChains === 1 ? "1 waiting for its next step" : `${f.openChains} waiting for their next step`}
                        </p>
                      )}
                      <p className="font-sans text-sm text-ink/70">
                        {f.def.dueAfterHour !== undefined && f.status.status !== "done" ? `Due by ${formatHour(f.def.dueAfterHour)}. ` : ""}
                        <span className="font-mono text-[11px] uppercase tracking-wide text-clay-brown">{FORM_TAG_LABELS[f.def.tag]}</span>
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}
