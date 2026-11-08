import "server-only";

// Server-side performance timing, off by default. Set PERF_TIMING=1 (locally in .env.local, or as a Vercel env var
// for a measurement deploy) to get one log line per instrumented layout/page with the ms spent on each awaited step,
// plus one line per Supabase HTTP request (see perfFetch below), so round trips per request can be counted.
//
// No Server-Timing response header: this project has no middleware (removed, see lib/supabase/server.ts) and a Server
// Component cannot set response headers, so logs are the only channel. The Playwright perf spec measures the browser
// side independently.

const ENABLED = process.env.PERF_TIMING === "1";

export function perfEnabled(): boolean {
  return ENABLED;
}

export interface PerfTimer {
  /** Awaits `value` and records how long it took under `label`. Call it inline: `await t.step("x", fetchX())`. */
  step<T>(label: string, value: PromiseLike<T> | T): Promise<T>;
  /** Logs the collected steps. A redirect() thrown mid-render skips this, which is fine for measurement. */
  end(): void;
}

const NOOP: PerfTimer = {
  step: async (_label, value) => value,
  end: () => {},
};

export function startTimer(scope: string): PerfTimer {
  if (!ENABLED) return NOOP;
  const t0 = performance.now();
  const steps: string[] = [];
  return {
    async step(label, value) {
      const s = performance.now();
      try {
        return await value;
      } finally {
        steps.push(`${label}=${Math.round(performance.now() - s)}ms`);
      }
    },
    end() {
      console.log(`[perf] ${scope} total=${Math.round(performance.now() - t0)}ms ${steps.join(" ")}`);
    },
  };
}

/**
 * fetch wrapper for Supabase clients: logs method, path (no query string) and duration of every request. Only
 * attached when PERF_TIMING=1, so production behaviour is untouched otherwise.
 */
export const perfFetch: typeof fetch = async (input, init) => {
  const s = performance.now();
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const method = init?.method ?? (typeof input === "object" && "method" in input ? input.method : "GET");
  let status = 0;
  try {
    const res = await fetch(input, init);
    status = res.status;
    return res;
  } finally {
    let path = url;
    try {
      path = new URL(url).pathname;
    } catch {}
    console.log(`[perf] supabase ${method} ${path} ${status} ${Math.round(performance.now() - s)}ms`);
  }
};
