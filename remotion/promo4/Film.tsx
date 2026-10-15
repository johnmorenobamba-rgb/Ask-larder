import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { C } from './brand';
import { useBrandFonts } from '../v2/fx';
import { ACT, CUE, CUT, CUT_TOTAL, DROPS, IGNITE, TOTAL, type ActKey } from './timeline';
import { Hook, fryerChitScreen } from './acts/Hook';
import { Ask } from './acts/Ask';
import { Pain2, pain2ChitCentre } from './acts/Pain2';
import { Forms } from './acts/Forms';
import { Stations, qrScreen } from './acts/Stations';
import { Urgency, Close, UrgencyLines, bubbleAt } from './acts/Close';
import { Punch, Shockwave } from './fx/Energy';

export { TOTAL, CUT_TOTAL };
// Promo v4: the film is the acts in order, one Sequence each (contiguous, bar aligned). Seams are built inside the acts.
// Render with: npx remotion render remotion/index.ts LarderPromo4 out/larder-promo-v4.mp4 --public-dir remotion/public-promo4
const ACTS: Partial<Record<ActKey, React.FC>> = { hook: Hook, ask: Ask, pain2: Pain2, forms: Forms, stations: Stations, urgency: Urgency, close: Close };

/** One act under the film wide camera punch (fx/Energy.tsx), on absolute frames. */
const Punched: React.FC<{ k: ActKey; Act: React.FC }> = ({ k, Act }) => {
  const f = useCurrentFrame();
  return (
    <Punch F={ACT[k].from + f}>
      <Act />
    </Punch>
  );
};

// Where each drop's shockwave starts: the point the incoming scene opens from.
const centre = (r: { x: number; y: number; w: number; h: number }) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
const SHOCKS: { at: number; x: number; y: number; reach?: number; r0?: number; width?: number }[] = [
  { at: DROPS[0], ...centre(fryerChitScreen(ACT.hook.dur - 1)) },
  { at: DROPS[1], ...pain2ChitCentre(ACT.pain2.dur - 1) },
  { at: DROPS[2], ...centre(qrScreen(CUE.lift3 - ACT.stations.from)) },
  { at: DROPS[3], ...centre(bubbleAt(CUE.close + 6)) },
  { at: IGNITE, ...centre(bubbleAt(IGNITE)), reach: 620, r0: 110, width: 10 }, // starts outside the mark, thin
];

const Picture: React.FC = () => {
  const F = useCurrentFrame();
  return (
    <>
      {(Object.keys(ACT) as ActKey[]).map((k) => {
        const Act = ACTS[k];
        return Act ? (
          <Sequence key={k} from={ACT[k].from} durationInFrames={ACT[k].dur}>
            <Punched k={k} Act={Act} />
          </Sequence>
        ) : null;
      })}
      {SHOCKS.map((s) => (
        <Shockwave key={s.at} F={F} at={s.at} x={s.x} y={s.y} reach={s.reach} r0={s.r0} width={s.width} />
      ))}
    </>
  );
};

// The mix is built by scripts/make-promo4-audio.mjs from the same timeline; a voiceover drops into its reserved
// windows there (the duck is applied only when a voice exists), so the picture never re-times.
export const Promo4: React.FC = () => {
  useBrandFonts();
  return (
    <AbsoluteFill style={{ background: C.night }}>
      <Picture />
      <Audio src={staticFile('audio/promo4-mix.wav')} />
    </AbsoluteFill>
  );
};

// The 30 s cutdown plays three source ranges of the same picture back to back (timeline.ts CUT), hard cuts on
// the beat. Its audio is the same mix spliced at the same frames (scripts/make-promo4-cut-audio.mjs).
// Render with: npx remotion render remotion/index.ts LarderPromo4Cut out/larder-promo-v4-30s.mp4 --public-dir remotion/public-promo4
export const Promo4Cut: React.FC = () => {
  useBrandFonts();
  return (
    <AbsoluteFill style={{ background: C.night }}>
      <UrgencyLines.Provider value={false}>
        {CUT.map((s) => (
          <Sequence key={s.id} from={s.at} durationInFrames={s.to - s.from}>
            <Sequence from={-s.from}>
              <Picture />
            </Sequence>
          </Sequence>
        ))}
      </UrgencyLines.Provider>
      <Audio src={staticFile('audio/promo4-cut-mix.wav')} />
    </AbsoluteFill>
  );
};
export const _f = useCurrentFrame;
