// Stub for the `server-only` package under Vitest, whose Vite-based module
// resolution triggers the package's browser-bundle guard the same way a
// real bundler would. Tests run under Node, not a browser, so it's safe
// to no-op here — see vitest.config.ts's resolve.alias.
export {};
