// This app declares no OIDC keys, no `configurations.env` defaults, and no
// `external`-kind dependency — so window._env_ carries nothing at all, in
// mock mode exactly as in production.
export const mockEnv = {};
