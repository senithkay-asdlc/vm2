// Typed read of window._env_. This app has no auth dependency, no
// `configurations.env` defaults, and no `external`-kind dependency — so there
// are no browser-visible keys to declare. The sibling ticket-api is reached
// same-origin at /api (see src/api.ts), never through window._env_.
type Env = Record<string, never>;

declare global {
  interface Window {
    _env_: Env;
  }
}

if (!window._env_) {
  throw new Error(
    "window._env_ not set — /env-config.js failed to load. " +
      "The platform mounts this file; if you see this locally, host " +
      "/env-config.js from your dev server.",
  );
}

export const env: Env = window._env_;
