// File names inside remotion/public-v2 (git ignored) and the moments in each recorded clip that the film cuts to.
// Frames are at 30 fps and relative to the start of the clip file. They are filled from the recorded tap logs.
export const A = {
  clips: {
    threeTaps: { src: "clips/three-taps-s1.mp4", w: 1024, h: 768, startFrom: 0, taps: [409, 520, 618] as number[] },
    failed: { src: "clips/failed-reading-s1.mp4", w: 820, h: 1180, startFrom: 358 },
    // showcase-1: two useful answers. answer1 and answer2 are the frames in the recorded clip where each answer is on screen; splitAt is where the scene cuts from one to the other.
    ask: { src: "clips/ask-larder-s1.mp4", w: 1024, h: 768, answer1: 735, answer2: 1395, splitAt: 140 },
    dashboard: { src: "clips/dashboard.mp4", w: 1920, h: 1080, startFrom: 105, rate: 1.5 },
    stations: { src: "clips/stations.mp4", w: 1920, h: 1080, startFrom: 90 },
  },
  broll: {
    dishUtensils: "broll/broll-dishpit-utensils.mp4",
    dishPan: "broll/broll-dishpit-pan.mp4",
    dishSink: "broll/broll-dishpit-sink.mp4",
    steam: "broll/broll-steam-counter.mp4",
  },
  img: { hub: "img/hub.png", qr: "img/qr.png" },
};
