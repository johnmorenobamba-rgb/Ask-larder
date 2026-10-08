// File names inside remotion/public-v2 (git ignored) and the moments in each recorded clip that the film cuts to.
// Frames are at 30 fps and relative to the start of the clip file. They are filled from the recorded tap logs.
export const A = {
  clips: {
    threeTaps: { src: "clips/three-taps.mp4", w: 1024, h: 768, startFrom: 0, taps: [395, 508, 606] as number[] },
    failed: { src: "clips/failed-reading.mp4", w: 820, h: 1180, startFrom: 360 },
    ask: { src: "clips/ask-larder.mp4", w: 1024, h: 768, startFrom: 1050 },
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
