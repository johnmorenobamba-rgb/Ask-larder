// Lets any component (e.g. the bento dashboard's Ask Larder tile) trigger
// the single floating AskLarderChat instance already mounted in the
// protected layout, rather than mounting a second overlay — per spec,
// the dashboard tile "is not a second mechanism," it opens the exact same
// overlay the floating bubble does.
const EVENT_NAME = "ask-larder:open-text";

export function openAskLarderOverlay() {
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function onAskLarderOpenRequest(handler: () => void) {
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
