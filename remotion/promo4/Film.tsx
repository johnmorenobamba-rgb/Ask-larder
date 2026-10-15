import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { C } from './brand';
import { useBrandFonts } from '../v2/fx';
import { ACT, CUT, CUT_TOTAL, TOTAL, type ActKey } from './timeline';
import { Hook } from './acts/Hook';
import { Ask } from './acts/Ask';
import { Pain2 } from './acts/Pain2';
import { Forms } from './acts/Forms';
import { Stations } from './acts/Stations';
import { Urgency, Close, UrgencyLines } from './acts/Close';

export { TOTAL, CUT_TOTAL };
// Promo v4: the film is the acts in order, one Sequence each (contiguous, bar aligned). Seams are built inside the acts.
// Render with: npx remotion render remotion/index.ts LarderPromo4 out/larder-promo-v4.mp4 --public-dir remotion/public-promo4
const ACTS: Partial<Record<ActKey, React.FC>> = { hook: Hook, ask: Ask, pain2: Pain2, forms: Forms, stations: Stations, urgency: Urgency, close: Close };

const Picture: React.FC = () => (
  <>
      {(Object.keys(ACT) as ActKey[]).map((k) => {
        const Act = ACTS[k];
        return Act ? (
          <Sequence key={k} from={ACT[k].from} durationInFrames={ACT[k].dur}>
            <Act />
          </Sequence>
        ) : null;
      })}
  </>
);

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
