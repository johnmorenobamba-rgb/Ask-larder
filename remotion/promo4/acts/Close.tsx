// Acts 6 and 7, bars 28 to 34 and the tail. Urgency: the cost of waiting, on Ink. Close: the empty question
// bubble answers "Book a walk through", then becomes the Larder mark beside the wordmark (landing 2 of 2).
import React, { createContext, useContext } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, FONT, BUBBLE_PATH } from '../brand';
import { E, prog, fd, mix, lmix, spr, clamp } from '../lib/anim';
import { CONTACT } from '../data';
import { ACT, CUE, copy } from '../timeline';
import { chitPath } from '../fx/Chit';
import { TypingDots } from '../fx/Thread';
import { MaskRise } from '../fx/MaskRise';
import { SPX } from '../fx/springs';

/** The cutdown enters on the empty bubble and hides the urgency lines, which need their own two bars to be read. */
export const UrgencyLines = createContext(true);

// ---- the device as one continuous object across both acts (absolute frames)
const BUBBLE_AT = CUE.emptyBubble;
const FILL = CUE.close + 2; // the dots resolve into the answer
const MORPH = [CUE.morph - 2, CUE.morph + 26] as const;
const BIG = { w: 900, h: 150 };
const LOCK = { mark: 120 }; // final mark height (px); the wordmark sits to its right
const LOCKUP = { y: 300, gap: 32, word: 150 };
const markX = () => 960 - (LOCK.mark + LOCKUP.gap + 470) / 2; // the lockup is centred (wordmark about 470 px wide)

/** The bubble's geometry at absolute frame F. */
const bubbleAt = (F: number) => {
  const appear = spr(F, BUBBLE_AT - 4, SPX.bubble);
  const grow = prog(F, CUE.close - 4, CUE.close + 14, E.out);
  const w0 = 300, h0 = 110; // the empty bubble with typing dots
  const w1 = mix(w0, BIG.w, grow), h1 = mix(h0, BIG.h, grow);
  const m = prog(F, MORPH[0], MORPH[1], E.inOut);
  const w = lmix(w1, LOCK.mark * (66 / 46), m), h = lmix(h1, LOCK.mark * 0.72, m);
  const cx = mix(960, markX() + (LOCK.mark * (66 / 46)) / 2, m);
  const cy = mix(mix(250, 300, grow), LOCKUP.y + LOCK.mark * 0.42, m);
  return { w, h, x: cx - w / 2, y: cy - h / 2, appear, grow, m };
};

const Device: React.FC<{ F: number }> = ({ F }) => {
  const b = bubbleAt(F);
  if (b.appear <= 0) return null;
  const s = b.h / 46;
  const landed = F >= MORPH[1] - 1;
  const contact = F >= MORPH[1] - 1 ? spr(F, MORPH[1] - 1, SPX.landCalm) : 0;
  const settle = landed ? 1 + (1 - contact) * 0.06 : 1; // the second landing: a small settle on the mark
  const textO = prog(F, FILL, FILL + 8, E.smooth) * (1 - prog(F, MORPH[0], MORPH[0] + 8, E.smooth));
  const dotsO = prog(F, BUBBLE_AT, BUBBLE_AT + 6, E.smooth) * (1 - prog(F, FILL - 4, FILL + 2, E.smooth));
  const fill = b.m < 0.5 ? C.saffron : C.parchment; // the device becomes the mark (Parchment on Ink) at the morph's midpoint
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${b.x.toFixed(2)}px, ${b.y.toFixed(2)}px, 0) scale(${(mix(0.85, 1, b.appear) * settle).toFixed(4)})`, transformOrigin: '50% 100%', width: b.w, height: b.h + 13 * s }}>
      <svg width={b.w} height={b.h + 13 * s} style={{ position: 'absolute', overflow: 'visible' }}>
        {b.m < 1 ? <path d={chitPath(b.w, b.h, s)} fill={fill} /> : <g transform={`scale(${(b.h + 13 * s) / 72})`}><path d={BUBBLE_PATH} fill={C.parchment} /></g>}
      </svg>
      {dotsO > 0 && <div style={{ position: 'absolute', left: b.w / 2 - 70, top: b.h / 2 - 32, opacity: dotsO }}><TypingDots frame={F} show={1} /></div>}
      {textO > 0 && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: b.w, height: b.h, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: 10 * s, fontFamily: FONT.display, fontWeight: 700, fontSize: 64, color: C.ink, letterSpacing: '-0.015em', opacity: textO }}>{CONTACT.cta}</div>
      )}
    </div>
  );
};

export const Urgency: React.FC = () => {
  const f = useCurrentFrame();
  const F = ACT.urgency.from + f;
  const k = 1 + 0.03 * prog(f, 0, ACT.urgency.dur, E.smooth);
  const l1 = copy('urgLine1'), l2 = copy('urgLine2');
  const lines = useContext(UrgencyLines);
  return (
    <AbsoluteFill style={{ background: C.night }}>
      {lines && <AbsoluteFill style={{ transform: `scale(${k.toFixed(5)})`, transformOrigin: '50% 50%' }}>
        <div style={{ position: 'absolute', left: 120, right: 120, top: 520, display: 'flex', justifyContent: 'center' }}>
          <MaskRise text={l1.text} frame={F} start={l1.in + 1} size={92} color={C.parchment} />
        </div>
        <div style={{ position: 'absolute', left: 120, right: 120, top: 660, display: 'flex', justifyContent: 'center' }}>
          <MaskRise text={l2.text} frame={F} start={l2.in + 1} size={92} color={C.saffron} />
        </div>
      </AbsoluteFill>}
      <Device F={F} />
    </AbsoluteFill>
  );
};

export const Close: React.FC = () => {
  const f = useCurrentFrame();
  const F = ACT.close.from + f;
  const lines = useContext(UrgencyLines);
  const out = prog(F, CUE.close - 2, CUE.close + 10, E.in); // the urgency lines leave as the answer arrives
  const dolly = 1 + 0.07 * prog(F, CUE.wordmark, ACT.close.from + ACT.close.dur, E.dolly);
  const word = prog(F, MORPH[1] - 8, CUE.wordmark + 4, E.out); // the wordmark slides out from behind the mark once it has landed
  const lineY = mix(470, 492, prog(F, MORPH[0], MORPH[1], E.inOut));
  const contacts = [
    { id: 'phone', text: CONTACT.phone, at: CUE.phone },
    { id: 'url', text: CONTACT.url, at: CUE.url },
    { id: 'email', text: CONTACT.email, at: CUE.email },
  ];
  return (
    <AbsoluteFill style={{ background: C.night }}>
      <AbsoluteFill style={{ transform: `scale(${dolly.toFixed(5)})`, transformOrigin: '50% 45%' }}>
        {/* the urgency lines, leaving */}
        {lines && out < 1 && (
          <AbsoluteFill style={{ opacity: 1 - out, transform: `translate3d(0, ${(-40 * out).toFixed(2)}px, 0)` }}>
            <div style={{ position: 'absolute', left: 120, right: 120, top: 520, textAlign: 'center', fontFamily: FONT.display, fontWeight: 700, fontSize: 92, color: C.parchment, letterSpacing: '-0.02em', lineHeight: 1.08 }}>{copy('urgLine1').text}</div>
            <div style={{ position: 'absolute', left: 120, right: 120, top: 660, textAlign: 'center', fontFamily: FONT.display, fontWeight: 700, fontSize: 92, color: C.saffron, letterSpacing: '-0.02em', lineHeight: 1.08 }}>{copy('urgLine2').text}</div>
          </AbsoluteFill>
        )}
        {/* the wordmark rises from behind the mark */}
        <div style={{ position: 'absolute', left: markX() + LOCK.mark * (66 / 46) + LOCKUP.gap, top: LOCKUP.y - 6, height: 170, overflow: 'hidden', width: 520 }}>
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: LOCKUP.word, lineHeight: 1, letterSpacing: '-0.035em', color: C.parchment, transform: `translate3d(${(-60 * (1 - word)).toFixed(2)}px, 0, 0)`, opacity: word }}>Larder</div>
        </div>
        {/* the call to action moves from inside the bubble to the line under the lockup */}
        {fd(F) >= MORPH[0] && (
          <div style={{ position: 'absolute', left: 0, right: 0, top: lineY, textAlign: 'center', fontFamily: FONT.display, fontWeight: 700, fontSize: 56, color: C.parchment, letterSpacing: '-0.015em', opacity: prog(F, MORPH[0] + 4, MORPH[0] + 14, E.smooth) }}>{CONTACT.cta}</div>
        )}
        {contacts.map((c, i) => (
          <div key={c.id} style={{ position: 'absolute', left: 120, right: 120, top: 620 + i * 66, display: 'flex', justifyContent: 'center' }}>
            <MaskRise text={c.text} frame={F} start={c.at} size={40} family={FONT.mono} weight={500} color={i === 0 ? C.saffron : C.parchment} stagger={2} />
          </div>
        ))}
      </AbsoluteFill>
      <Device F={F} />
    </AbsoluteFill>
  );
};
export const _u = { clamp };
