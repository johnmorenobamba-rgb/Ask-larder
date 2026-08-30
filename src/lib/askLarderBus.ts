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

// Lets other floating chrome (the near-miss report button) hide itself
// while the Ask Larder overlay is open, rather than two competing floating
// actions both being visible/tappable at once with a modal up.
const STATE_EVENT_NAME = "ask-larder:overlay-state";

export function broadcastAskLarderOverlayState(open: boolean) {
  window.dispatchEvent(new CustomEvent<boolean>(STATE_EVENT_NAME, { detail: open }));
}

export function onAskLarderOverlayStateChange(handler: (open: boolean) => void) {
  const listener = (e: Event) => handler((e as CustomEvent<boolean>).detail);
  window.addEventListener(STATE_EVENT_NAME, listener);
  return () => window.removeEventListener(STATE_EVENT_NAME, listener);
}
