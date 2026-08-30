// Block L8 -- one shared spring config, replacing the app's flat
// `active:scale-[0.97]`/`hover:scale-[1.0x]` CSS transitions everywhere
// they appeared, so every tappable row/button shares the same physical
// feel instead of each spot picking its own linear ease. framer-motion
// (not GSAP) -- this is interactive-UI press/hover feedback, not timeline
// choreography (see L5's own GSAP-for-timelines/Motion-for-UI split).
export const SPRING_PRESS = { type: "spring", duration: 0.5, bounce: 0.25 } as const;
