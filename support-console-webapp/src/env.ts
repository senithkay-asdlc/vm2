// Typed read of window._env_, the platform's runtime config channel. The
// platform mounts /env-config.js before the bundle runs (index.html); this
// throws rather than defaulting a missing key, because a silent fallback here
// hides a missing OIDC issuer at the one place it would be loud.
//
// The four keys below are this app's `agent-auth` platform-resource
// dependency's outputs (UPPER_SNAKE of the dependency name "agent-auth").
// <DEP>_JWKS_URL is emitted by the platform too, but is NOT declared here: the
// browser never validates a token — the API gateway does — so no asset reads
// it.
//
// There is no sibling API URL key here on purpose: ticket-api is reached
// same-origin at /api (react-webapp), never through window._env_.

type Env = {
  AGENT_AUTH_CLIENT_ID: string;
  AGENT_AUTH_ISSUER: string;
  AGENT_AUTH_SCOPES: string;
  AGENT_AUTH_RESOURCE: string;
};

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
