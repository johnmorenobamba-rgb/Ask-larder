// Product screens redrawn from the real app components, laid out in tablet CSS px (1024 wide, the
// capture library's viewport) so the camera can push in and type stays sharp. Class to px mapping
// follows Tailwind: text-xs 12, sm 14, base 16, lg 18, xl 20, 2xl 24, 3xl 30; rounded-2xl 16, 3xl 24;
// border-2 2 px. Every string comes from data.ts. Each component is a pure function of `frame`.
import React from 'react';
import { C, FONT, BUBBLE_PATH } from './brand';
import { ASK, FORMS, STATION, VENUE } from './data';
import { E, prog, fd, mix, clamp, spr, SPR, arrive, hitPulse } from './lib/anim';
import { mixColor } from './lib/color';
import { Stream } from './fx/Stream';

export const APP = { W: 1024, H: 768 };
const clayA = (a: number) => `rgba(122,92,67,${a})`;
const inkA = (a: number) => `rgba(31,27,22,${a})`;
/** border-clay-brown/40 composited on Parchment (the app draws it with alpha). */
const CLAY40 = "#C2B19C";

/** The staff app's top bar (src/app/(staff) layout): Ink bar, mark, "Larder", venue, menu. */
export const AppBar: React.FC<{ venue?: string }> = ({ venue = VENUE }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, width: APP.W, height: 56, background: C.ink, display: 'flex', alignItems: 'center', padding: '0 28px', justifyContent: 'space-between' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.parchment, fontFamily: FONT.display, fontWeight: 700, fontSize: 18 }}>
      <svg width={22} height={22} viewBox="0 0 72 72"><path d={BUBBLE_PATH} fill={C.parchment} /></svg>Larder
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 22, color: C.parchment, fontFamily: FONT.text, fontSize: 14 }}>
      {venue}
      <svg width={22} height={16} viewBox="0 0 22 16"><path d="M0 1h22M0 8h22M0 15h22" stroke={C.parchment} strokeWidth={2} /></svg>
    </div>
  </div>
);

/** Small press envelope for a button: 0..1 down over 2 f, back over 4 f. */
export const pressEnv = (f: number, at: number) => { const t = f - at; return t <= 0 || t >= 6 ? 0 : t < 2 ? t / 2 : 1 - (t - 2) / 4; };

// ---------------------------------------------------------------- Ask Larder sheet (AskLarderChat.tsx)
export const SHEET = { x: 288, y: 332, w: 448 }; // measured on the capture: the real sheet sits at 288, 332 // max-w-md, centred, rising from the bottom of the tablet
export const ASK_SLOTS = {
  input: { x: SHEET.x + 24, y: SHEET.y + 24 + 28 + 16, w: 448 - 48 - 92 - 12, h: 50 },
  askBtn: { x: SHEET.x + 448 - 24 - 92, y: SHEET.y + 24 + 28 + 16, w: 92, h: 50 },
  question: { x: SHEET.x + 24, y: SHEET.y + 24 + 28 + 16 },
  answer: { x: SHEET.x + 24, y: SHEET.y + 24 + 28 + 16 + 20 + 12 },
};
export type AskState = {
  mode: 'input' | 'answer';
  typed: string; // text in the input
  caret: boolean;
  asked?: string;
  answer?: string;
  answerStart?: number; // frame the answer starts streaming
  escalation?: boolean;
  shell: number; // 0..1 answer box grows (shell first)
  pressAsk?: number; // button press 0..1
  focus: number;
  another?: number; // 0..1 "Ask another question" visible
};
export const AskSheet: React.FC<{ frame: number; s: AskState }> = ({ frame: f, s }) => {
  const short = (s.answer ?? '').length <= ASK.shortAnswerChars;
  return (
    <div style={{ position: 'absolute', left: SHEET.x, top: SHEET.y, width: SHEET.w, minHeight: APP.H - SHEET.y + 40, background: C.parchment, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: '24px 24px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, height: 28 }}>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 20, color: C.ink }}>{ASK.title}</div>
        <div style={{ fontFamily: FONT.mono, fontSize: 12, color: C.clay }}>{ASK.close}</div>
      </div>
      {s.mode === 'input' ? (
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, height: 50, borderRadius: 16, border: `2px solid ${mixColor(CLAY40, C.red, s.focus)}`, padding: '0 16px', display: 'flex', alignItems: 'center', fontFamily: FONT.text, fontSize: 16, color: C.ink, whiteSpace: 'pre', overflow: 'hidden' }}>
            {s.typed ? s.typed : <span style={{ color: inkA(0.45) }}>{ASK.placeholder}</span>}
            {s.caret && <span style={{ display: 'inline-block', width: 2, height: 20, background: C.ink, marginLeft: 1 }} />}
          </div>
          <div style={{ width: 92, height: 50, borderRadius: 25, background: C.red, color: C.parchment, fontFamily: FONT.text, fontWeight: 500, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: s.typed.trim() ? 1 : 0.5, transform: `scale(${1 - 0.06 * (s.pressAsk ?? 0)})` }}>{ASK.button}</div>
        </div>
      ) : (
        <div>
          <div style={{ fontFamily: FONT.text, fontStyle: 'italic', fontSize: 14, color: C.clay, height: 20, marginBottom: 12 }}>{s.asked}</div>
          <div style={{ borderRadius: 16, border: `2px solid ${s.escalation ? C.clay : C.bay}`, padding: '16px 16px', transformOrigin: '50% 0', opacity: clamp(s.shell * 1.4), transform: `scaleY(${mix(0.6, 1, s.shell)})` }}>
            <div style={{ opacity: clamp((s.shell - 0.5) * 2) }}>
              <Stream frame={f} text={s.answer ?? ''} start={s.answerStart ?? 0} size={short ? 18 : 16} family={short ? FONT.display : FONT.text} width={448 - 48 - 36} />
            </div>
          </div>
          <div style={{ marginTop: 12, fontFamily: FONT.mono, fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase', color: C.clay, textDecoration: 'underline', opacity: s.another ?? 0 }}>{ASK.another}</div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------- Checklist page (GenericComplianceForm.tsx)
export const CHECK = { left: 128, width: 768, rowTop: 452, rowH: 112, rowGap: 12, markBtn: { x: 128 + 768 - 196, y: 384, w: 196, h: 44 }, save: { x: 1024 - 128 - 180, y: 768 - 58 - 4, w: 180, h: 52 } };
export const passBtn = (i: number) => ({ x: CHECK.left + 12, y: CHECK.rowTop + i * (CHECK.rowH + CHECK.rowGap) + 50, w: (CHECK.width - 24 - 24) / 3, h: 46 });
export const ChecklistPage: React.FC<{ frame: number; build: number; passAt: number[]; checked: number; saveReady: number; savePress: number; saved: number }> = ({ frame: f, build, passAt, checked, saveReady, savePress, saved }) => {
  const piece = (i: number) => clamp((build - i * 0.08) / 0.4); // shell first: children enter in order
  const rise = (i: number) => ({ opacity: piece(i), transform: `translate3d(0, ${((1 - arrive(piece(i))) * 8).toFixed(2)}px, 0)` });
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: APP.W, height: APP.H + 400, background: C.parchment }}>
      <AppBar />
      <div style={{ position: 'absolute', left: CHECK.left, top: 84, width: CHECK.width }}>
        <div style={{ ...rise(0), fontFamily: FONT.mono, fontSize: 12, letterSpacing: '0.05em', color: C.clay }}>BACK TO FORMS</div>
        <div style={{ ...rise(1), marginTop: 16, fontFamily: FONT.display, fontWeight: 700, fontSize: 30, color: C.ink }}>{FORMS.checklistTitle}</div>
        <div style={{ ...rise(2), marginTop: 6, fontFamily: FONT.text, fontSize: 16, color: inkA(0.75) }}>{FORMS.checklistIntro}</div>
        <div style={{ ...rise(3), marginTop: 10, display: 'flex', gap: 10, alignItems: 'center', fontFamily: FONT.text, fontSize: 14, color: inkA(0.75) }}>
          <span style={{ border: `1px solid ${C.clay}`, borderRadius: 999, padding: '1px 8px', fontFamily: FONT.mono, fontSize: 11, letterSpacing: '0.05em', color: C.clay }}>RECOMMENDED RECORD</span>
          {FORMS.checklistCadence}
        </div>
        <div style={{ ...rise(4), marginTop: 10, fontFamily: FONT.text, fontSize: 13, lineHeight: 1.45, color: inkA(0.65), width: 700 }}>{FORMS.checklistNote}</div>
      </div>
      {saved > 0 ? (
        <div style={{ position: 'absolute', left: CHECK.left, top: 330, width: CHECK.width, opacity: saved }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 11, color: C.clay, letterSpacing: '0.05em' }}>DONE</div>
          <div style={{ marginTop: 8, borderRadius: 16, border: `2px solid ${C.bay}`, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', fontFamily: FONT.text, fontSize: 16, color: C.ink,
            transform: `scale(${mix(0.97, 1, saved)})`, transformOrigin: '50% 0' }}>
            <span style={{ fontWeight: 500 }}>{FORMS.doneCard.line}</span><span style={{ fontSize: 14, color: inkA(0.7) }}>{FORMS.doneCard.meta}</span>
          </div>
          <div style={{ marginTop: 10, fontFamily: FONT.text, fontSize: 14, color: inkA(0.7) }}>{FORMS.doneFoot}</div>
        </div>
      ) : null}
      <div style={{ position: 'absolute', left: CHECK.left, top: 380, width: CHECK.width, ...rise(5), opacity: piece(5) * (1 - saved) }}>
        <div style={{ fontFamily: FONT.text, fontWeight: 500, fontSize: 16, color: C.ink }}>{FORMS.section}</div>
        <div style={{ marginTop: 6, fontFamily: FONT.text, fontSize: 14, color: inkA(0.7), fontVariantNumeric: 'tabular-nums' }}>{checked} of {FORMS.checkCount} checked</div>
      </div>
      <div style={{ position: 'absolute', left: CHECK.markBtn.x, top: CHECK.markBtn.y, width: CHECK.markBtn.w, height: CHECK.markBtn.h, borderRadius: 22, border: `2px solid ${C.clay}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.text, fontWeight: 500, fontSize: 14, color: C.ink, ...rise(5), opacity: piece(5) * (1 - saved) }}>{FORMS.markRest}</div>
      {FORMS.checks.map((label, i) => {
        const y = CHECK.rowTop + i * (CHECK.rowH + CHECK.rowGap) + (saved > 0 ? 150 * saved : 0);
        const p = passAt[i] !== undefined ? prog(f, passAt[i] - 1, passAt[i] + 5, E.ui) : 0;
        const punch = passAt[i] !== undefined ? 1 + 0.03 * hitPulse(f - passAt[i], 1, 4) : 1;
        const on = p * (1 - saved);
        return (
          <div key={i} style={{ position: 'absolute', left: CHECK.left, top: y, width: CHECK.width, height: CHECK.rowH, borderRadius: 16, border: `2px solid ${C.clay}`, padding: '12px 12px', ...rise(6 + i) }}>
            <div style={{ fontFamily: FONT.text, fontSize: 16, color: C.ink, paddingLeft: 2 }}>{label}</div>
            <div style={{ marginTop: 10, display: 'flex', gap: 12 }}>
              {FORMS.options.map((o, j) => (
                <div key={o} style={{ flex: 1, height: 46, borderRadius: 23, border: `2px solid ${j === 0 ? mixColor(C.clay, C.bay, on) : C.clay}`, background: j === 0 ? `rgba(85,96,60,${on})` : 'transparent', color: j === 0 ? mixColor(C.ink, C.parchment, on) : C.ink,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.text, fontWeight: j === 0 && on > 0.5 ? 600 : 400, fontSize: 16, transform: j === 0 ? `scale(${punch})` : undefined }}>{o}</div>
              ))}
            </div>
          </div>
        );
      })}
      {/* the sticky Save bar */}
      <div style={{ position: 'absolute', left: 0, top: APP.H - 76, width: APP.W, height: 76, background: C.parchment, borderTop: `2px solid ${clayA(0.2)}` }}>
        {saved > 0 && <div style={{ position: 'absolute', left: CHECK.left, top: 26, fontFamily: FONT.text, fontSize: 16, color: C.ink, opacity: saved }}>{FORMS.recordSaved}</div>}
        <div style={{ position: 'absolute', left: CHECK.save.x, top: 12, width: CHECK.save.w, height: 52, borderRadius: 26, background: mixColor(C.clay, C.red, saveReady * (1 - saved)), color: C.parchment, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.text, fontWeight: 500, fontSize: 18,
          transform: `scale(${1 - 0.05 * savePress})` }}>{FORMS.saveRecord}</div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- Temperature log card (TemperatureLogForm.tsx)
export const TEMP = { card: { x: 232, y: 150, w: 560 }, field: { x: 232 + 16 + 56 + 8, y: 150 + 16 + 28 + 20 + 16 + 24 + 8, w: 560 - 32 - 64, h: 56 } };
export const TempPage: React.FC<{ frame: number; typed: string; caret: boolean; focus: number; out: number; note: string; noteOn: number; chipPress: number; saveReady: number; savePress: number; saved: number }> = ({ frame: f, typed, caret, focus, out, note, noteOn, chipPress, saveReady, savePress, saved }) => {
  const reading = FORMS.outOfRange(FORMS.unit.limit, FORMS.unit.reading);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: APP.W, height: APP.H, background: C.parchment }}>
      <AppBar />
      <div style={{ position: 'absolute', left: TEMP.card.x, top: 84, fontFamily: FONT.display, fontWeight: 700, fontSize: 20, color: C.ink }}>Cold storage</div>
      <div style={{ position: 'absolute', left: TEMP.card.x, top: 112, fontFamily: FONT.text, fontSize: 14, color: inkA(0.8) }}>
        <span style={{ border: `1px solid ${C.clay}`, borderRadius: 999, padding: '1px 8px', fontFamily: FONT.mono, fontSize: 11, letterSpacing: '0.05em', color: C.clay, marginRight: 8 }}>RECOMMENDED RECORD</span>
        Suggested limit: keep potentially hazardous food at 5°C or colder.
      </div>
      <div style={{ position: 'absolute', left: TEMP.card.x, top: TEMP.card.y, width: TEMP.card.w, borderRadius: 16, border: `2px solid ${out > 0.5 ? C.red : C.clay}`, padding: 16 }}>
        <div style={{ fontFamily: FONT.text, fontWeight: 500, fontSize: 18, color: C.ink, height: 28 }}>{FORMS.unit.name}</div>
        <div style={{ fontFamily: FONT.text, fontSize: 14, color: inkA(0.8), height: 20 }}>{FORMS.unit.limit}</div>
        <div style={{ marginTop: 16, fontFamily: FONT.text, fontWeight: 500, fontSize: 16, color: C.ink, height: 24 }}>Reading (°C)</div>
        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, border: `2px solid ${C.clay}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.display, fontWeight: 700, fontSize: 24, color: C.ink }}>−</div>
          <div style={{ flex: 1, height: 56, borderRadius: 16, border: `2px solid ${mixColor(C.clay, out > 0.5 ? C.red : C.ink, Math.max(focus, out))}`, boxShadow: focus > 0 ? `0 0 0 ${4 * focus}px rgba(31,27,22,${0.35 * focus})` : undefined, display: 'flex', alignItems: 'center', padding: '0 16px', fontFamily: FONT.display, fontWeight: 700, fontSize: 30, color: C.ink }}>
            {typed}{caret && <span style={{ display: 'inline-block', width: 2, height: 30, background: C.ink, marginLeft: 2 }} />}
          </div>
        </div>
        <div style={{ height: 34 + 236 * out, overflow: 'hidden' }}>
        <div style={{ marginTop: 8, minHeight: 28, fontFamily: FONT.text, fontWeight: 500, fontSize: 16, color: C.red, opacity: out }}>{reading}</div>
        <div style={{ opacity: out, marginTop: 6 }}>
          <div style={{ fontFamily: FONT.text, fontWeight: 500, fontSize: 16, color: C.red }}>{FORMS.noteLabel}</div>
          <div style={{ marginTop: 8, minHeight: 50, borderRadius: 16, border: `2px solid ${noteOn > 0.5 ? C.ink : C.red}`, padding: '12px 16px', fontFamily: FONT.text, fontSize: 16, color: C.ink }}>{noteOn > 0 ? note : ''}</div>
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {FORMS.quickNotes.map((q, i) => (
              <div key={q} style={{ height: 44, borderRadius: 22, border: `2px solid ${i === 0 ? mixColor(C.clay, C.ink, chipPress) : C.clay}`, background: clayA(0.1), padding: '0 16px', display: 'flex', alignItems: 'center', fontFamily: FONT.text, fontSize: 14, color: C.ink, transform: i === 0 ? `scale(${1 - 0.05 * chipPress})` : undefined }}>{q}</div>
            ))}
          </div>
        </div>
        </div>
      </div>
      {/* sticky bar */}
      <div style={{ position: 'absolute', left: 0, top: APP.H - 84, width: APP.W, height: 84, background: C.parchment, borderTop: `1px solid ${clayA(0.25)}` }}>
        <div style={{ position: 'absolute', left: TEMP.card.x, top: 20, width: 360, fontFamily: FONT.text, fontWeight: 500, fontSize: 14, lineHeight: 1.4, color: saved > 0 ? C.ink : C.red, opacity: Math.max(out * (1 - noteOn), saved) }}>
          {saved > 0 ? FORMS.savedFlagged : FORMS.blocker}
        </div>
        <div style={{ position: 'absolute', left: TEMP.card.x + TEMP.card.w - 172, top: 14, width: 172, height: 56, borderRadius: 28, background: mixColor(C.clay, C.red, saveReady * (1 - saved)), color: C.parchment, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.text, fontWeight: 500, fontSize: 18, transform: `scale(${1 - 0.05 * savePress})` }}>{FORMS.saveReading}</div>
      </div>
    </div>
  );
};
export const TEMP_TARGETS = {
  field: { x: TEMP.field.x + 60, y: TEMP.field.y + 28 },
  chip: { x: TEMP.card.x + 16 + 110, y: TEMP.card.y + 16 + 28 + 20 + 16 + 24 + 8 + 56 + 8 + 28 + 6 + 24 + 8 + 50 + 10 + 22 },
  save: { x: TEMP.card.x + TEMP.card.w - 86, y: APP.H - 84 + 42 },
};

// ---------------------------------------------------------------- Station hub and troubleshooting (station/[qrCodeSlug])
export const HUB = { left: 256, width: 512, top: 72 }; // max-w-lg, centred
export const hubCard = (i: number) => ({ x: HUB.left, y: HUB.top + 30 + 52 + 32 + i * (98 + 16), w: HUB.width, h: 98 });
export const StationHub: React.FC<{ frame: number; build: number; pressT: number; hoverT: number }> = ({ frame: f, build, pressT, hoverT }) => {
  const piece = (i: number) => clamp((build - i * 0.12) / 0.4);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: APP.W, height: APP.H, background: C.parchment }}>
      <div style={{ position: 'absolute', left: HUB.left, top: HUB.top, opacity: piece(0), fontFamily: FONT.mono, fontSize: 12, letterSpacing: '0.05em', color: C.clay }}>{STATION.name.toUpperCase()}</div>
      <div style={{ position: 'absolute', left: HUB.left, top: HUB.top + 22, opacity: piece(1), fontFamily: FONT.display, fontWeight: 700, fontSize: 30, color: C.ink }}>{STATION.heading}</div>
      {STATION.cards.map((c, i) => {
        const r = hubCard(i);
        const isT = i === 2;
        return (
          <div key={c.title} style={{ position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h, borderRadius: 16, border: `2px solid ${isT ? mixColor(CLAY40, C.red, hoverT) : CLAY40}`, padding: '24px 20px',
            opacity: piece(2 + i), transform: `translate3d(0, ${((1 - arrive(piece(2 + i))) * 8).toFixed(2)}px, 0) scale(${isT ? 1 - 0.03 * pressT : 1})` }}>
            <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 20, color: C.ink }}>{c.title}</div>
            <div style={{ marginTop: 4, fontFamily: FONT.text, fontSize: 14, color: inkA(0.7) }}>{c.text}</div>
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: 24, top: APP.H - 24 - 64, width: 64, height: 64, borderRadius: 32, background: C.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: piece(5) }}>
        <svg width={30} height={30} viewBox="0 0 72 72"><path d={BUBBLE_PATH} fill={C.saffron} /></svg>
      </div>
      <div style={{ position: 'absolute', right: 24, top: APP.H - 24 - 44, height: 44, borderRadius: 22, background: C.ink, color: C.parchment, padding: '0 18px', display: 'flex', alignItems: 'center', fontFamily: FONT.text, fontWeight: 500, fontSize: 14, opacity: piece(5) }}>{STATION.unsafe}</div>
    </div>
  );
};
export const TS = { left: 256, width: 512, top: 72, cardTop: 72 + 18 + 22 + 44 + 20 };
const TsCard: React.FC<{ title: string; tryThis: string; then: string }> = ({ title, tryThis, then }) => (
  <div style={{ borderRadius: 16, border: '2px solid #C9B9A2', padding: '16px 16px', marginBottom: 16 }}>
    <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 18, color: C.ink }}>{title}</div>
    <div style={{ marginTop: 8, fontFamily: FONT.mono, fontSize: 12, letterSpacing: '0.05em', color: C.clay }}>TRY THIS</div>
    <div style={{ marginTop: 4, fontFamily: FONT.text, fontSize: 14, lineHeight: 1.5, color: inkA(0.8) }}>{tryThis}</div>
    <div style={{ marginTop: 8, fontFamily: FONT.mono, fontSize: 12, letterSpacing: '0.05em', color: C.clay }}>THEN</div>
    <div style={{ marginTop: 4, fontFamily: FONT.text, fontSize: 14, lineHeight: 1.5, color: inkA(0.8) }}>{then}</div>
    <div style={{ marginTop: 10, borderLeft: `4px solid ${C.red}`, borderTopRightRadius: 8, borderBottomRightRadius: 8, background: 'rgba(178,58,44,0.05)', padding: '10px 12px 10px 14px', fontFamily: FONT.text, fontSize: 14, color: C.ink }}>{STATION.issue.escalation}</div>
  </div>
);
/** Card heights are fixed so the camera can aim at "Pours are flat or weak" without measuring. */
export const TS_CARD_Y = (i: number) => TS.cardTop + i * 372;
export const TroublePage: React.FC<{ frame: number; build: number }> = ({ build }) => {
  const piece = (i: number) => clamp((build - i * 0.1) / 0.4);
  const cards = [...STATION.issues, STATION.issue, ...STATION.laterIssues.map((t) => ({ title: t, tryThis: '', then: '' }))];
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: APP.W, height: 2000, background: C.parchment }}>
      <div style={{ position: 'absolute', left: TS.left, top: TS.top, opacity: piece(0), fontFamily: FONT.mono, fontSize: 12, letterSpacing: '0.05em', color: C.clay }}>← {STATION.back.toUpperCase()}</div>
      <div style={{ position: 'absolute', left: TS.left, top: TS.top + 22, opacity: piece(0), fontFamily: FONT.mono, fontSize: 12, letterSpacing: '0.05em', color: C.clay }}>{STATION.name.toUpperCase()}</div>
      <div style={{ position: 'absolute', left: TS.left, top: TS.top + 40, opacity: piece(1), fontFamily: FONT.display, fontWeight: 700, fontSize: 30, color: C.ink }}>{STATION.troubleshootingTitle}</div>
      {cards.slice(0, 3).map((c, i) => (
        <div key={c.title} style={{ position: 'absolute', left: TS.left, top: TS_CARD_Y(i), width: TS.width, opacity: piece(2 + i) }}>
          <TsCard title={c.title} tryThis={c.tryThis} then={c.then} />
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------- QR label sticker (owner label page)
import { Qr } from './fx/Qr';
export const Sticker: React.FC<{ w?: number }> = ({ w = 220 }) => (
  <div style={{ width: w, borderRadius: 14, background: '#FFFFFF', boxShadow: '0 2px 3px rgba(31,27,22,0.35), 0 12px 22px rgba(31,27,22,0.30)', padding: `${w * 0.08}px 0 ${w * 0.07}px`, textAlign: 'center' }}>
    <div style={{ fontFamily: FONT.mono, fontSize: w * 0.055, letterSpacing: '0.12em', color: C.red }}>LARDER</div>
    <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: w * 0.11, color: C.ink, marginTop: 2 }}>{STATION.name}</div>
    <div style={{ fontFamily: FONT.text, fontSize: w * 0.05, color: inkA(0.6) }}>{STATION.venue}</div>
    <div style={{ margin: `${w * 0.05}px auto 0`, width: w * 0.68 }}><Qr text={STATION.qrTarget} size={w * 0.68} color="#000000" bg="#FFFFFF" /></div>
    <div style={{ marginTop: w * 0.05, fontFamily: FONT.mono, fontSize: w * 0.045, letterSpacing: '0.1em', color: C.clay }}>{STATION.labelFoot.toUpperCase()}</div>
  </div>
);
export const unused = { fd, spr, SPR };
