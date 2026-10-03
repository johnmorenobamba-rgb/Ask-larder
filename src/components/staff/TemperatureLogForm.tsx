"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { StickyBar } from "@/components/staff/StickyBar";
import { formatTemp, isPendingMinus, parseReadingInput, unitOutOfRange, type LimitKind } from "@/lib/compliance/b2";

// Staff B2 temperature log, built for a kitchen iPad: one card per unit, a large
// numeric field with a plus/minus button (the iOS decimal keypad has no minus key,
// which every freezer needs), live in range or out of range in WORDS as well as
// colour (a persistent state, not just focus), and a required note that only appears
// when a reading is out of range. Pending units come first, and a sticky bar at the
// bottom carries Save plus the reason it is disabled. The DATABASE decides whether a
// reading is out of range; the preview here only guides the person typing. No Stamp:
// a routine log is not one of the trust moments.

export type UnitRow = {
  unitId: string;
  name: string;
  unitType: "cold" | "frozen" | "hot_hold";
  limitKind: LimitKind;
  limitC: number;
  minC: number | null;
  maxC: number | null;
  /** plain sentence, for example "Keep at 5°C or colder" */
  limitText: string;
  latest: { id: string; readingC: number | null; outOfRange: boolean; note: string | null; time: string; by: string } | null;
  /** the last reading from an earlier day (none logged today), so a flag nobody has rechecked stays visible */
  prior: { time: string; readingC: number | null; outOfRange: boolean } | null;
  /** earlier readings today that a newer reading has replaced as the latest */
  earlier: { id: string; readingC: number | null; outOfRange: boolean; time: string; by: string }[];
};

export type UnitGroup = { type: "cold" | "frozen" | "hot_hold"; heading: string; tagLabel: string; basis: string; units: UnitRow[] };

type RowState = { value: string; note: string; correcting: boolean };

const QUICK_NOTES = ["Moved food to another unit", "Discarded the food", "Called a technician", "Will recheck in 30 minutes"];

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });
}

export function TemperatureLogForm({
  groups,
  canSetUp,
  setupHref,
}: {
  groups: UnitGroup[];
  canSetUp: boolean;
  setupHref: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ saved: number; flagged: number } | null>(null);
  // A retry with unchanged input reuses its request id, so a double tap or a flaky
  // network can never write the same reading twice; changing the value makes a new id.
  const requestIds = useRef<Map<string, string>>(new Map());

  const allUnits = useMemo(() => groups.flatMap((g) => g.units), [groups]);

  function rowOf(u: UnitRow): RowState {
    return rows[u.unitId] ?? { value: "", note: "", correcting: false };
  }
  function setRow(u: UnitRow, patch: Partial<RowState>) {
    setResult(null);
    setError(null);
    setRows((prev) => ({ ...prev, [u.unitId]: { ...(prev[u.unitId] ?? { value: "", note: "", correcting: false }), ...patch } }));
  }
  function toggleMinus(u: UnitRow) {
    const v = rowOf(u).value.trim();
    setRow(u, { value: /^[-−]/.test(v) ? v.slice(1) : `-${v}` });
  }

  type Entry = { unit: UnitRow; reading: number; outOfRange: boolean; note: string; correctsId: string | null };
  const entries: Entry[] = [];
  let missingNote = false;
  let unreadable = false;
  for (const u of allUnits) {
    const st = rowOf(u);
    if (st.value.trim() === "" || isPendingMinus(st.value)) continue;
    const reading = parseReadingInput(st.value);
    if (reading === null) {
      unreadable = true;
      continue;
    }
    const outOfRange = unitOutOfRange({ min_temp_c: u.minC, max_temp_c: u.maxC }, reading);
    const note = st.note.trim();
    if (outOfRange && note === "") missingNote = true;
    entries.push({ unit: u, reading, outOfRange, note, correctsId: st.correcting && u.latest ? u.latest.id : null });
  }
  const canSave = entries.length > 0 && !missingNote && !unreadable && !saving;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    setResult(null);
    try {
      const body = {
        entries: entries.map((e) => {
          const key = `${e.unit.unitId}|${e.reading}|${e.correctsId ?? ""}`;
          let id = requestIds.current.get(key);
          if (!id) {
            id = newId();
            requestIds.current.set(key, id);
          }
          return {
            clientRequestId: id,
            unitId: e.unit.unitId,
            readingC: e.reading,
            correctiveAction: e.outOfRange ? e.note : e.note || undefined,
            correctsSubmissionId: e.correctsId ?? undefined,
          };
        }),
      };
      const res = await fetch("/api/staff/compliance/b2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Couldn't save the readings. Your readings are still here, try again.");
        return;
      }
      const saved = Array.isArray(data?.saved) ? data.saved : [];
      setResult({ saved: saved.length, flagged: saved.filter((s: { outOfRange: boolean }) => s.outOfRange).length });
      requestIds.current.clear();
      setRows({});
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Your readings are still here, try again.");
    } finally {
      setSaving(false);
    }
  }

  if (allUnits.length === 0) {
    return (
      <div className="space-y-3 rounded-2xl border-2 border-clay-brown px-5 py-6">
        <p className="font-sans text-base text-ink">No fridges, freezers or hot hold units are set up yet.</p>
        {canSetUp ? (
          <a href={setupHref} className="inline-flex min-h-12 items-center rounded-full bg-preserve-red px-6 font-sans font-medium text-parchment">
            Set up units
          </a>
        ) : (
          <p className="font-sans text-sm text-ink/70">Ask your manager to add them in the venue setup.</p>
        )}
      </div>
    );
  }

  // the visible reason Save is disabled (kept in the sticky bar, next to the button)
  const blocker = unreadable
    ? "One of the readings is not a temperature. Check the numbers."
    : missingNote
      ? "Write what you did about each out of range reading before you save."
      : null;
  const showBar = entries.length > 0 || !!error || !!result || !!blocker;

  return (
    <div className="space-y-8">
      {groups.map((group) => {
        // pending units first, then out of range, then logged in range
        const rank = (u: UnitRow) => (!u.latest ? 0 : u.latest.outOfRange ? 1 : 2);
        const ordered = group.units.slice().sort((a, b) => rank(a) - rank(b));
        const loggedCount = group.units.filter((u) => u.latest).length;
        return (
          <section key={group.type} aria-labelledby={`group-${group.type}`} className="space-y-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id={`group-${group.type}`} className="font-display text-xl font-bold text-ink">
                  {group.heading}
                </h2>
                <p className="font-sans text-sm text-ink/70">
                  {loggedCount} of {group.units.length} logged
                </p>
              </div>
              <p className="font-sans text-sm text-ink/80">
                <span className="mr-2 inline-block rounded-full border border-clay-brown px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide text-clay-brown">
                  {group.tagLabel}
                </span>
                {group.basis}
              </p>
            </div>

            <div className="grid items-start gap-3 md:grid-cols-2">
              {ordered.map((u) => {
                const st = rowOf(u);
                const parsed = st.value.trim() === "" || isPendingMinus(st.value) ? null : parseReadingInput(st.value);
                const typedBad = st.value.trim() !== "" && !isPendingMinus(st.value) && parsed === null;
                const out = parsed !== null && unitOutOfRange({ min_temp_c: u.minC, max_temp_c: u.maxC }, parsed);
                const inRange = parsed !== null && !out;
                const showInput = !u.latest || st.correcting;
                const loggedOut = !!u.latest && u.latest.outOfRange && !st.correcting;
                const fieldId = `reading-${u.unitId}`;
                const noteId = `note-${u.unitId}`;
                const noteMissing = out && st.note.trim() === "";
                const cardBorder = out || loggedOut ? "border-preserve-red" : inRange ? "border-bay-green" : "border-clay-brown";
                return (
                  <div key={u.unitId} className={`space-y-3 rounded-2xl border-2 px-4 py-4 ${cardBorder}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-sans text-lg font-medium text-ink">{u.name}</p>
                        <p className="font-sans text-sm text-ink/80">{u.limitText}</p>
                      </div>
                      {u.latest && !st.correcting && (
                        <p
                          className={`shrink-0 rounded-full px-3 py-1 font-mono text-xs uppercase tracking-wide ${
                            u.latest.outOfRange ? "bg-preserve-red text-parchment" : "bg-bay-green/15 text-bay-green"
                          }`}
                        >
                          {u.latest.outOfRange ? "Out of range" : "In range"}
                        </p>
                      )}
                    </div>

                    {!u.latest && u.prior && (
                      <p className={`font-sans text-sm ${u.prior.outOfRange ? "font-medium text-preserve-red" : "text-ink/70"}`}>
                        Last reading {u.prior.readingC !== null ? formatTemp(u.prior.readingC) : ""}, {u.prior.time}
                        {u.prior.outOfRange ? ". Out of range and not rechecked yet." : "."}
                      </p>
                    )}

                    {u.latest && !st.correcting && (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                          <p className={`font-display text-3xl font-bold ${u.latest.outOfRange ? "text-preserve-red" : "text-ink"}`}>
                            {u.latest.readingC !== null ? formatTemp(u.latest.readingC) : "No reading"}
                          </p>
                          <p className="font-sans text-sm text-ink/70">
                            {u.latest.time} by {u.latest.by}
                          </p>
                        </div>
                        {u.latest.outOfRange && u.latest.note && <p className="font-sans text-sm text-ink">Action: {u.latest.note}</p>}
                        <button
                          type="button"
                          onClick={() => setRow(u, { correcting: true, value: "", note: "" })}
                          className="min-h-12 rounded-full border-2 border-clay-brown px-5 font-sans font-medium text-ink hover:border-ink"
                        >
                          Correct this reading
                        </button>
                      </div>
                    )}

                    {showInput && (
                      <div className="space-y-2">
                        <label htmlFor={fieldId} className="font-mono text-xs uppercase tracking-wide text-clay-brown">
                          {st.correcting ? "Corrected reading" : "Reading"} (°C)
                        </label>
                        <div className="flex items-stretch gap-2">
                          <button
                            type="button"
                            onClick={() => toggleMinus(u)}
                            aria-label={`Make ${u.name} reading negative or positive`}
                            aria-pressed={/^[-−]/.test(st.value.trim())}
                            className="min-h-14 w-14 shrink-0 rounded-2xl border-2 border-clay-brown bg-parchment font-display text-2xl font-bold text-ink hover:bg-clay-brown/10"
                          >
                            {"−"}
                          </button>
                          <input
                            id={fieldId}
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            enterKeyHint="done"
                            value={st.value}
                            onChange={(e) => setRow(u, { value: e.target.value })}
                            aria-describedby={`${fieldId}-status`}
                            aria-invalid={typedBad || out}
                            placeholder="0.0"
                            className={`min-h-14 w-full rounded-2xl border-2 px-4 font-display text-3xl font-bold text-ink outline-none focus:ring-4 focus:ring-ink/25 ${
                              out
                                ? "border-preserve-red bg-preserve-red/10"
                                : inRange
                                  ? "border-bay-green bg-bay-green/10"
                                  : "border-clay-brown bg-parchment"
                            }`}
                          />
                        </div>
                        <p id={`${fieldId}-status`} aria-live="polite" className="min-h-7 font-sans text-base">
                          {typedBad && <span className="text-preserve-red">Enter a temperature, for example 3.5 or {"−"}18.</span>}
                          {inRange && <span className="font-medium text-bay-green">In range</span>}
                          {out && (
                            <span className="font-medium text-preserve-red">
                              Out of range. {u.limitText}, this reading is {formatTemp(parsed!)}.
                            </span>
                          )}
                        </p>

                        {out && (
                          <div className="space-y-2">
                            <label htmlFor={noteId} className="font-sans text-base font-medium text-preserve-red">
                              What did you do about it? (required)
                            </label>
                            <textarea
                              id={noteId}
                              value={st.note}
                              onChange={(e) => setRow(u, { note: e.target.value })}
                              rows={2}
                              maxLength={1000}
                              aria-required="true"
                              aria-invalid={noteMissing}
                              className={`w-full rounded-2xl border-2 bg-parchment px-4 py-3 font-sans text-base text-ink outline-none focus:ring-4 focus:ring-ink/25 ${
                                noteMissing ? "border-preserve-red" : "border-clay-brown"
                              }`}
                            />
                            <div className="flex flex-wrap gap-2">
                              {QUICK_NOTES.map((q) => (
                                <button
                                  key={q}
                                  type="button"
                                  onClick={() => setRow(u, { note: st.note.trim() ? `${st.note.trim()}. ${q}` : q })}
                                  className="min-h-11 rounded-full border-2 border-clay-brown bg-clay-brown/10 px-4 font-sans text-sm text-ink hover:border-ink"
                                >
                                  {q}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {st.correcting && (
                          <button
                            type="button"
                            onClick={() => setRow(u, { correcting: false, value: "", note: "" })}
                            className="min-h-11 px-3 font-mono text-xs uppercase tracking-wide text-clay-brown hover:text-ink"
                          >
                            Cancel correction
                          </button>
                        )}
                      </div>
                    )}

                    {u.earlier.length > 0 && (
                      <div className="border-t-2 border-clay-brown/20 pt-3">
                        <p className="font-mono text-xs uppercase tracking-wide text-clay-brown">Earlier today</p>
                        <ul className="mt-1 space-y-1">
                          {u.earlier.map((e) => (
                            <li key={e.id} className="font-sans text-sm text-ink/80">
                              {e.readingC !== null ? formatTemp(e.readingC) : "No reading"}
                              {e.outOfRange ? ", out of range" : ""}, {e.time} by {e.by}
                            </li>
                          ))}
                        </ul>
                        <p className="mt-1 font-sans text-sm text-ink/70">
                          Only the latest reading for a unit can be corrected. Log a new reading to change it.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {showBar && (
        <StickyBar>
          <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="min-w-0 flex-1 space-y-1">
              {blocker && <p className="font-sans text-sm font-medium text-preserve-red">{blocker}</p>}
              {error && (
                <p role="alert" className="font-sans text-sm font-medium text-preserve-red">
                  {error}
                </p>
              )}
              {result && (
                <p role="status" className="font-sans text-base font-medium text-ink">
                  {result.saved === 1 ? "1 reading saved." : `${result.saved} readings saved.`}
                  {result.flagged > 0
                    ? ` ${result.flagged === 1 ? "1 was" : `${result.flagged} were`} out of range and flagged for the owner.`
                    : ""}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={save}
              disabled={!canSave}
              className="min-h-14 w-full rounded-full bg-preserve-red px-8 font-sans text-lg font-medium text-parchment disabled:bg-clay-brown disabled:text-parchment sm:w-auto"
            >
              {saving ? "Saving…" : entries.length > 1 ? `Save ${entries.length} readings` : "Save reading"}
            </button>
          </div>
        </StickyBar>
      )}
    </div>
  );
}
