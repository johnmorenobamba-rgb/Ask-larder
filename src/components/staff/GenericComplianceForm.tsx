"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { StickyBar } from "@/components/staff/StickyBar";
import { formatTemp, isPendingMinus } from "@/lib/compliance/b2";
import { parseNumberInput } from "@/lib/compliance/engine/numberInput";
import { evaluateFail, type FieldValue } from "@/lib/compliance/engine/rules";
import type { FailRule, FieldDef } from "@/lib/compliance/engine/types";

// Staff form for every generic compliance form (checklists, single readings, registers, staged
// forms, cash with a second signature). Built for a kitchen iPad: large targets, the pass or fail
// shown in WORDS as well as colour, a required note that only appears on a fail, and a sticky Save
// bar that says why Save is disabled. The DATABASE decides pass or fail; the preview here only guides
// the person filling it in. No Stamp: a routine record is not one of the trust moments.

export type FieldView = FieldDef;

export type RecordSummary = {
  id: string;
  time: string;
  by: string;
  failed: boolean;
  reasons: string[];
  note: string | null;
  headline: string;
  isLatest: boolean;
};

export type RegisterRowView = {
  subject: string;
  title: string;
  detail: string;
  retired: boolean;
  values: Record<string, string>;
  time: string;
};

export type FormViewProps = {
  formId: string;
  title: string;
  blurb: string;
  stage: string | null;
  stageLabel: string | null;
  chainId: string | null;
  fields: FieldView[];
  failRules: FailRule[];
  allowCorrection: boolean;
  cosign: boolean;
  cosigners: { id: string; name: string }[];
  isRegister: boolean;
  event: boolean;
  /** records made in the current period (or recent for event forms), newest first */
  records: RecordSummary[];
  registerRows: RegisterRowView[];
  /** shown when the form was already done this period */
  doneNote: string | null;
  backHref: string;
  /** true for kitchen forms, where throwing food out is a sensible quick note */
  foodForm: boolean;
};

type ChecklistValue = Record<string, "pass" | "fail" | "na">;
type Raw = string | ChecklistValue;

const QUICK_NOTES_GENERAL = ["Fixed it on the spot", "Told the manager", "Called a technician", "Will recheck soon"];
const QUICK_NOTE_FOOD = "Threw the food out";

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });
}

function parseNumber(raw: string): number | null {
  if (raw.trim() === "" || isPendingMinus(raw)) return null;
  return parseNumberInput(raw);
}

function hasMoreThanTwoDecimals(n: number): boolean {
  return Math.abs(n * 100 - Math.round(n * 100)) > 1e-6;
}

export function GenericComplianceForm(props: FormViewProps) {
  const { fields, failRules } = props;
  const router = useRouter();
  const [values, setValues] = useState<Record<string, Raw>>({});
  const [note, setNote] = useState("");
  const [correcting, setCorrecting] = useState<string | null>(null);
  const [cosignId, setCosignId] = useState("");
  const [cosignPin, setCosignPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ failed: boolean; reasons: string[]; stageLabel: string | null } | null>(null);
  const requestId = useRef(newId());

  const setField = (key: string, v: Raw) => {
    setResult(null);
    setError(null);
    setValues((cur) => ({ ...cur, [key]: v }));
  };

  // parsed values for the preview and the request
  const parsed = useMemo(() => {
    const out: Record<string, FieldValue> = {};
    const bad: string[] = [];
    for (const f of fields) {
      const raw = values[f.key];
      if (f.type === "number" || f.type === "money") {
        const s = typeof raw === "string" ? raw : "";
        if (s.trim() === "") continue;
        const n = parseNumber(s);
        if (n === null || (f.type === "money" && (n < 0 || hasMoreThanTwoDecimals(n))) || n < (f.type === "number" ? f.min : (f.min ?? 0)) || n > (f.max ?? (f.type === "money" ? 10000000 : 150))) {
          bad.push(f.label);
          continue;
        }
        out[f.key] = n;
      } else if (f.type === "checklist") {
        if (raw && typeof raw === "object") out[f.key] = raw;
      } else if (typeof raw === "string" && raw.trim() !== "") {
        out[f.key] = raw.trim();
      }
    }
    return { out, bad };
  }, [fields, values]);

  const missing = fields.filter((f) => {
    if (f.required === false) return false;
    if (f.type === "checklist") {
      const raw = values[f.key];
      return !raw || typeof raw !== "object" || f.items.some((i) => !(raw as ChecklistValue)[i.key]);
    }
    return parsed.out[f.key] === undefined;
  });

  const reasons = useMemo(() => (missing.length === 0 && parsed.bad.length === 0 ? evaluateFail(failRules, parsed.out) : []), [missing.length, parsed, failRules]);
  const complete = missing.length === 0 && parsed.bad.length === 0;
  const failed = complete && reasons.length > 0;
  const passed = complete && reasons.length === 0;
  const noteMissing = failed && note.trim() === "";
  const cosignMissing = props.cosign && (!cosignId || !/^\d{4,6}$/.test(cosignPin));

  const blocker = parsed.bad.length > 0
    ? `Check the answer for: ${parsed.bad[0]}.`
    : missing.length > 0
      ? Object.keys(values).length === 0
        ? null
        : `Still to fill in: ${missing[0].label}${missing.length > 1 ? ` and ${missing.length - 1} more` : ""}.`
      : noteMissing
        ? "Write what you did about it before you save."
        : cosignMissing
          ? "A second person must choose their name and enter their PIN."
          : null;
  const canSave = complete && !noteMissing && !cosignMissing && !saving;
  const showBar = Object.keys(values).length > 0 || !!error || !!result;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    setResult(null);
    const body = {
      clientRequestId: requestId.current,
      stage: props.stage ?? undefined,
      chainId: props.chainId ?? undefined,
      values: parsed.out,
      correctiveAction: failed ? note.trim() : note.trim() || undefined,
      correctsSubmissionId: correcting ?? undefined,
      cosign: props.cosign ? { staffId: cosignId, pin: cosignPin } : undefined,
    };
    try {
      const res = await fetch(`/api/staff/compliance/forms/${props.formId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Couldn't save the record. Try again.");
        setSaving(false);
        return;
      }
      setResult({ failed: !!data.failed, reasons: Array.isArray(data.failReasons) ? data.failReasons : [], stageLabel: props.stageLabel });
      requestId.current = newId();
      setValues({});
      setNote("");
      setCorrecting(null);
      setCosignPin("");
      setSaving(false);
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Your answers are still here. Try again.");
      setSaving(false);
    }
  }

  function loadForCorrection(r: RecordSummary) {
    setCorrecting(r.id);
    setValues({});
    setNote("");
    requestId.current = newId();
    setResult(null);
  }

  function loadRegisterRow(row: RegisterRowView) {
    const next: Record<string, Raw> = {};
    for (const f of fields) if (row.values[f.key] !== undefined) next[f.key] = row.values[f.key];
    setValues(next);
    setResult(null);
    requestId.current = newId();
  }

  const judged = failRules.length > 0;
  const preview = !judged ? null : (
    <p aria-live="polite" className="min-h-7 font-sans text-base">
      {passed && <span className="font-medium text-bay-green">Pass. Everything is within the limits.</span>}
      {failed && (
        <span className="font-medium text-preserve-red">
          Fail. {reasons.join(". ")}.
        </span>
      )}
    </p>
  );

  return (
    <div className="space-y-6">
      {/* keeps a field that scrolls into view clear of the sticky Save bar */}
      <style>{`html { scroll-padding-bottom: 14rem; }`}</style>
      {props.records.length > 0 && !props.isRegister && (
        <section aria-label="Records so far" className="space-y-2">
          <h2 className="font-mono text-xs uppercase tracking-wide text-clay-brown">{props.event ? "Recent records" : "Done"}</h2>
          <ul className="space-y-2">
            {props.records.map((r) => (
              <li key={r.id} className={`space-y-1 rounded-2xl border-2 px-4 py-3 ${r.failed ? "border-preserve-red" : "border-bay-green"}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className={`font-sans text-base font-medium ${r.failed ? "text-preserve-red" : "text-ink"}`}>
                    {judged ? (r.failed ? "Fail" : "Pass") : "Saved"}. {r.headline}
                  </p>
                  <p className="font-sans text-sm text-ink/70">
                    {r.time} by {r.by}
                  </p>
                </div>
                {r.failed && r.reasons.length > 0 && <p className="font-sans text-sm text-ink">{r.reasons.join(". ")}.</p>}
                {r.failed && r.note && <p className="font-sans text-sm text-ink">Action: {r.note}</p>}
                {props.allowCorrection && r.isLatest && correcting !== r.id && (
                  <button
                    type="button"
                    onClick={() => loadForCorrection(r)}
                    className="mt-1 min-h-11 rounded-full border-2 border-clay-brown px-5 font-sans text-sm font-medium text-ink hover:border-ink"
                  >
                    Correct this record
                  </button>
                )}
              </li>
            ))}
          </ul>
          {props.doneNote && <p className="font-sans text-sm text-ink/70">{props.doneNote}</p>}
        </section>
      )}

      <section aria-label={correcting ? "Correct the record" : "Fill in the form"} className="space-y-5">
        {correcting && (
          <p className="rounded-2xl border-2 border-clay-brown px-4 py-3 font-sans text-sm text-ink">
            You are correcting the latest record. The original stays on file and this one is linked to it.{" "}
            <button type="button" className="inline-flex min-h-11 items-center font-medium underline" onClick={() => { setCorrecting(null); setValues({}); }}>
              Cancel correction
            </button>
          </p>
        )}
        {fields.map((f) => (
          <FieldInput key={f.key} field={f} raw={values[f.key]} onChange={(v) => setField(f.key, v)} />
        ))}

        {preview}

        {failed && (
          <div className="space-y-2">
            <label htmlFor="fail-note" className="font-sans text-base font-medium text-preserve-red">
              What did you do about it? (required)
            </label>
            <textarea
              id="fail-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={1000}
              aria-required="true"
              aria-invalid={noteMissing}
              className={`w-full rounded-2xl border-2 bg-parchment px-4 py-3 font-sans text-base text-ink outline-none focus:ring-4 focus:border-ink focus:ring-ink/60 ${noteMissing ? "border-preserve-red" : "border-clay-brown"}`}
            />
            <div className="flex flex-wrap gap-2">
              {(props.foodForm ? [QUICK_NOTES_GENERAL[0], QUICK_NOTES_GENERAL[1], QUICK_NOTE_FOOD, ...QUICK_NOTES_GENERAL.slice(2)] : QUICK_NOTES_GENERAL).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setNote((n) => (n.trim() ? `${n.trim()}. ${q}` : q))}
                  className="min-h-11 rounded-full border-2 border-clay-brown bg-clay-brown/10 px-4 font-sans text-sm text-ink hover:border-ink"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {props.cosign && (
          <fieldset className="space-y-3 rounded-2xl border-2 border-clay-brown px-4 py-4">
            <legend className="px-2 font-mono text-xs uppercase tracking-wide text-clay-brown">Second signature</legend>
            <p className="font-sans text-sm text-ink/80">A second person confirms the count with their own PIN. It cannot be you.</p>
            <label htmlFor="cosign-who" className="font-sans text-base font-medium text-ink">
              Who is signing
            </label>
            <select
              id="cosign-who"
              value={cosignId}
              onChange={(e) => setCosignId(e.target.value)}
              className="min-h-14 w-full rounded-2xl border-2 border-clay-brown bg-parchment px-4 font-sans text-lg text-ink"
            >
              <option value="">Choose a name</option>
              {props.cosigners.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <label htmlFor="cosign-pin" className="font-sans text-base font-medium text-ink">
              Their PIN
            </label>
            <input
              id="cosign-pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              value={cosignPin}
              onChange={(e) => setCosignPin(e.target.value.replace(/\D/g, ""))}
              className="min-h-14 w-full rounded-2xl border-2 border-clay-brown bg-parchment px-4 font-display text-2xl text-ink outline-none focus:ring-4 focus:border-ink focus:ring-ink/60"
            />
          </fieldset>
        )}
      </section>

      {props.isRegister && props.registerRows.length > 0 && (
        <section aria-label="Register" className="space-y-2">
          <h2 className="font-mono text-xs uppercase tracking-wide text-clay-brown">Register</h2>
          <ul className="space-y-2">
            {props.registerRows.map((row) => (
              <li key={row.subject} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-clay-brown/60 px-4 py-3">
                <div>
                  <p className={`font-sans text-base font-medium ${row.retired ? "text-ink/60" : "text-ink"}`}>
                    {row.title}
                    {row.retired ? " (no longer used)" : ""}
                  </p>
                  <p className="font-sans text-sm text-ink/70">{row.detail}</p>
                  <p className="font-sans text-xs text-ink/75">Updated {row.time}</p>
                </div>
                <button
                  type="button"
                  onClick={() => loadRegisterRow(row)}
                  className="min-h-11 rounded-full border-2 border-clay-brown px-5 font-sans text-sm font-medium text-ink hover:border-ink"
                >
                  Update
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {showBar && (
        <StickyBar>
          <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="min-w-0 flex-1 space-y-1">
              {blocker && <p className="font-sans text-base font-medium text-preserve-red">{blocker}</p>}
              {error && (
                <p role="alert" className="font-sans text-sm font-medium text-preserve-red">
                  {error}
                </p>
              )}
              {result && (
                <p role="status" className="font-sans text-base font-medium text-ink">
                  {result.stageLabel ? `${result.stageLabel} saved.` : "Record saved."}
                  {result.failed ? " It failed and is flagged for the owner." : ""}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={save}
              disabled={!canSave}
              className="min-h-14 w-full rounded-full bg-preserve-red px-8 font-sans text-lg font-medium text-parchment disabled:bg-clay-brown disabled:text-parchment sm:w-auto"
            >
              {saving ? "Saving…" : correcting ? "Save correction" : props.isRegister ? "Save entry" : "Save record"}
            </button>
          </div>
        </StickyBar>
      )}
    </div>
  );
}

function FieldInput({ field, raw, onChange }: { field: FieldView; raw: Raw | undefined; onChange: (v: Raw) => void }) {
  const id = `f-${field.key}`;
  const label = (
    <span className="font-sans text-base font-medium text-ink">
      {field.label}
      {field.required === false ? <span className="ml-2 font-mono text-xs uppercase tracking-wide text-clay-brown">Optional</span> : null}
    </span>
  );
  const hint = field.hint ? <p className="font-sans text-sm text-ink/70">{field.hint}</p> : null;

  if (field.type === "checklist") {
    const cur = (raw && typeof raw === "object" ? raw : {}) as ChecklistValue;
    const allPass = () => onChange(Object.fromEntries(field.items.map((i) => [i.key, cur[i.key] ?? "pass"])) as ChecklistValue);
    return (
      <fieldset className="space-y-3">
        <legend className="mb-1">{label}</legend>
        <div className="flex items-center justify-between gap-3">
          <p className="font-sans text-sm text-ink/70">
            {field.items.filter((i) => cur[i.key]).length} of {field.items.length} checked
          </p>
          <button
            type="button"
            onClick={allPass}
            className="min-h-11 rounded-full border-2 border-clay-brown px-4 font-sans text-sm font-medium text-ink hover:border-ink"
          >
            Mark the rest as pass
          </button>
        </div>
        <ul className="space-y-2">
          {field.items.map((i) => {
            const v = cur[i.key];
            return (
              <li key={i.key} className={`space-y-2 rounded-2xl border-2 px-4 py-3 ${v === "fail" ? "border-preserve-red" : v ? "border-bay-green" : "border-clay-brown"}`}>
                <p className="font-sans text-base text-ink">{i.label}</p>
                <div className="flex gap-2" role="group" aria-label={i.label}>
                  {(["pass", "fail", "na"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      aria-pressed={v === opt}
                      onClick={() => onChange({ ...cur, [i.key]: opt })}
                      className={`min-h-12 flex-1 rounded-full border-2 px-3 font-sans text-base font-medium ${
                        v === opt
                          ? opt === "fail"
                            ? "border-preserve-red bg-preserve-red text-parchment"
                            : "border-bay-green bg-bay-green text-parchment"
                          : "border-clay-brown bg-parchment text-ink hover:border-ink"
                      }`}
                    >
                      {opt === "pass" ? "Pass" : opt === "fail" ? "Fail" : "Not applicable"}
                    </button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </fieldset>
    );
  }

  if (field.type === "passfail") {
    const v = typeof raw === "string" ? raw : "";
    return (
      <fieldset className="space-y-2">
        <legend className="mb-1">{label}</legend>
        {hint}
        <div className="flex gap-2">
          {(["pass", "fail"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              aria-pressed={v === opt}
              onClick={() => onChange(opt)}
              className={`min-h-14 flex-1 rounded-full border-2 px-4 font-sans text-lg font-medium ${
                v === opt
                  ? opt === "fail"
                    ? "border-preserve-red bg-preserve-red text-parchment"
                    : "border-bay-green bg-bay-green text-parchment"
                  : "border-clay-brown bg-parchment text-ink hover:border-ink"
              }`}
            >
              {opt === "pass" ? (field.passLabel ?? "Pass") : (field.failLabel ?? "Fail")}
            </button>
          ))}
        </div>
      </fieldset>
    );
  }

  if (field.type === "choice") {
    const v = typeof raw === "string" ? raw : "";
    return (
      <fieldset className="space-y-2">
        <legend className="mb-1">{label}</legend>
        {hint}
        <div className="flex flex-wrap gap-2">
          {field.options.map((o) => (
            <button
              key={o.value}
              type="button"
              aria-pressed={v === o.value}
              onClick={() => onChange(o.value)}
              className={`min-h-12 rounded-full border-2 px-5 font-sans text-base font-medium ${
                v === o.value ? "border-ink bg-ink text-parchment" : "border-clay-brown bg-parchment text-ink hover:border-ink"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </fieldset>
    );
  }

  if (field.type === "time") {
    const v = typeof raw === "string" ? raw : "";
    return (
      <div className="space-y-2">
        <label htmlFor={id}>{label}</label>
        {hint}
        <div className="flex gap-2">
          <input
            id={id}
            type="time"
            value={v}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-14 w-full rounded-2xl border-2 border-clay-brown bg-parchment px-4 font-display text-2xl text-ink outline-none focus:ring-4 focus:border-ink focus:ring-ink/60"
          />
          <button
            type="button"
            onClick={() => {
              const d = new Date();
              onChange(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
            }}
            aria-label={`Set ${field.label} to now`}
            className="min-h-14 shrink-0 rounded-2xl border-2 border-clay-brown px-5 font-sans text-base font-medium text-ink hover:border-ink"
          >
            Now
          </button>
        </div>
      </div>
    );
  }

  if (field.type === "number" || field.type === "money") {
    const v = typeof raw === "string" ? raw : "";
    const canNegate = field.type === "number" && field.allowNegative;
    return (
      <div className="space-y-2">
        <label htmlFor={id}>{label}</label>
        {hint}
        <div className="flex items-stretch gap-2">
          {canNegate && (
            <button
              type="button"
              aria-label={`Make ${field.label} negative or positive`}
              aria-pressed={/^[-−]/.test(v.trim())}
              onClick={() => onChange(/^[-−]/.test(v.trim()) ? v.trim().replace(/^[-−]/, "") : `−${v.trim()}`)}
              className="min-h-14 w-14 shrink-0 rounded-2xl border-2 border-clay-brown bg-parchment font-display text-2xl font-bold text-ink hover:bg-clay-brown/10"
            >
              {"−"}
            </button>
          )}
          {field.type === "money" && <span className="flex items-center font-display text-2xl font-bold text-ink">$</span>}
          <input
            id={id}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            enterKeyHint="done"
            value={v}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.type === "money" ? "0.00" : "0.0"}
            className="min-h-14 w-full rounded-2xl border-2 border-clay-brown bg-parchment px-4 font-display text-3xl font-bold text-ink outline-none focus:ring-4 focus:border-ink focus:ring-ink/60"
          />
          {field.type === "number" && field.unit && <span className="flex items-center font-sans text-base text-ink/70">{field.unit}</span>}
        </div>
        {v.trim() !== "" && !isPendingMinus(v) && parseNumber(v) === null && (
          <p role="alert" className="font-sans text-sm text-preserve-red">Enter a number, for example {formatTemp(3.5).replace("°C", "")}.</p>
        )}
      </div>
    );
  }

  // text
  const v = typeof raw === "string" ? raw : "";
  return (
    <div className="space-y-2">
      <label htmlFor={id}>{label}</label>
      {hint}
      {field.multiline ? (
        <textarea
          id={id}
          value={v}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          maxLength={field.maxLength ?? 300}
          className="w-full rounded-2xl border-2 border-clay-brown bg-parchment px-4 py-3 font-sans text-base text-ink outline-none focus:ring-4 focus:border-ink focus:ring-ink/60"
        />
      ) : (
        <input
          id={id}
          type="text"
          autoComplete="off"
          value={v}
          onChange={(e) => onChange(e.target.value)}
          maxLength={field.maxLength ?? 120}
          className="min-h-14 w-full rounded-2xl border-2 border-clay-brown bg-parchment px-4 font-sans text-lg text-ink outline-none focus:ring-4 focus:border-ink focus:ring-ink/60"
        />
      )}
    </div>
  );
}
