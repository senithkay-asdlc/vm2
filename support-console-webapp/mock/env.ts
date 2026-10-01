// mock mode's window._env_ — exactly the keys src/env.ts declares for the
// `agent-auth` platform-resource dependency, plus nothing a sibling API would
// need (ticket-api is same-origin /api, never a browser key).

export const mockEnv = {
  AGENT_AUTH_CLIENT_ID: "mock-client",
  AGENT_AUTH_ISSUER: "https://mock-idp.test",
  // No AGENT_AUTH_JWKS_URL: the browser never validates a token, so src/env.ts
  // does not declare it and mock mode does not carry it either.
  // group/ou singular, as the platform requests them, plus the project's own
  // catalog handles (security.json's SupportAgent role).
  AGENT_AUTH_SCOPES:
    "openid profile email group ou tickets:read-all tickets:edit-draft tickets:approve tickets:resolve",
  AGENT_AUTH_RESOURCE: "https://mock-idp.test/resources/vm2",
};
