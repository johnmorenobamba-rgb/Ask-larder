type EventName =
  | "ask_larder_open_tap"
  | "ask_larder_hold_start"
  | "ask_larder_hold_end"
  | "ask_larder_question_submitted"
  | "ask_larder_answer_shown"
  | "ask_larder_fallback_shown"
  | "ask_larder_error_shown";

let posthogPromise: Promise<typeof import("posthog-js").default> | null = null;

function getPosthog() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  if (!posthogPromise) {
    posthogPromise = import("posthog-js").then((mod) => {
      mod.default.init(key, { api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com" });
      return mod.default;
    });
  }
  return posthogPromise;
}

/**
 * Safe no-op analytics wrapper. CLAUDE.md frames whether staff use Ask
 * Larder unprompted as the product's core success metric, but
 * NEXT_PUBLIC_POSTHOG_KEY isn't set yet -- calls here no-op cleanly until a
 * key is added, so the instrumentation is ready without blocking anything
 * or throwing when unconfigured.
 */
export function track(event: EventName, properties?: Record<string, unknown>) {
  const client = getPosthog();
  if (!client) return;
  client.then((ph) => ph.capture(event, properties)).catch(() => {});
}
